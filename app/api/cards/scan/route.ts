import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type ScanCard = {
  id: string;
  name: string | null;
  name_fr: string | null;
  collection_number: string | null;
  imageUrl: string | null;
  usd: number | null;
  usd_foil: number | null;
};

function normalise(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function scannedNumberParts(value: string) {
  const fractions = value.match(/\d{1,3}\s*\/\s*\d{1,3}/g) ?? [];
  const plainNumbers = value.match(/\d{1,3}/g) ?? [];
  return Array.from(new Set([
    ...fractions.map((part) => part.replace(/\s/g, "")),
    ...plainNumbers.map((part) => String(Number(part))),
  ]));
}

function cardNumberParts(value: string) {
  const fractions = value.match(/\d{1,3}\s*\/\s*\d{1,3}/g) ?? [];
  if (fractions.length) {
    return Array.from(new Set(fractions.flatMap((part) => {
      const clean = part.replace(/\s/g, "");
      return [clean, String(Number(clean.split("/")[0]))];
    })));
  }
  return Array.from(new Set((value.match(/\d{1,3}/g) ?? []).map((part) => String(Number(part)))));
}

function scoreCard(card: ScanCard, number: string, name: string) {
  const scannedNumbers = scannedNumberParts(number);
  // Le dénominateur « /204 » décrit le set, pas la carte : il ne doit jamais suffire à proposer un résultat.
  const cardNumbers = cardNumberParts(card.collection_number ?? "");
  const scannedName = normalise(name);
  const names = [card.name, card.name_fr].filter(Boolean).map((value) => normalise(value as string));
  let score = 0;

  for (const scannedNumber of scannedNumbers) {
    for (const cardNumber of cardNumbers) {
      if (scannedNumber === cardNumber) {
        // Une correspondance complète « 123/204 » est le meilleur indice.
        score = Math.max(score, scannedNumber.includes("/") ? 94 : 70);
      } else if (scannedNumber.includes("/") && cardNumber.includes("/") && scannedNumber.split("/")[0] === cardNumber.split("/")[0]) {
        score = Math.max(score, 74);
      } else if (!scannedNumber.includes("/") && !cardNumber.includes("/") && scannedNumber === cardNumber) {
        score = Math.max(score, 70);
      }
    }
  }

  if (scannedName) {
    const words = scannedName.split(" ").filter((word) => word.length > 2);
    const nameScore = Math.max(0, ...names.map((candidate) => {
      if (candidate === scannedName) return 100;
      const matches = words.filter((word) => candidate.includes(word)).length;
      return words.length ? (matches / words.length) * 100 : 0;
    }));
    score += nameScore * 0.3;
  }

  return Math.min(99, Math.round(score));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chapter = searchParams.get("chapter") ?? "";
    const number = searchParams.get("number") ?? "";
    const name = searchParams.get("name") ?? "";

    if (!chapter || (!number.trim() && !name.trim())) return NextResponse.json([]);

    const cards = await prisma.card.findMany({
      where: { setCode: chapter },
      select: { id: true, name: true, name_fr: true, collection_number: true, imageUrl: true, usd: true, usd_foil: true },
    });

    return NextResponse.json(cards
      .map((card) => ({ ...card, confidence: scoreCard(card, number, name) }))
      .filter((card) => card.confidence >= 25)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5));
  } catch (error) {
    console.error("CARD SCAN ERROR:", error);
    return NextResponse.json({ error: "Erreur de recherche du scanner." }, { status: 500 });
  }
}
