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

function numberPart(value: string) {
  const match = value.match(/\d{1,3}(?:\s*\/\s*\d{1,3})?/);
  return match?.[0].replace(/\s/g, "") ?? "";
}

function scoreCard(card: ScanCard, number: string, name: string) {
  const scannedNumber = numberPart(number);
  const cardNumber = numberPart(card.collection_number ?? "");
  const scannedName = normalise(name);
  const names = [card.name, card.name_fr].filter(Boolean).map((value) => normalise(value as string));
  let score = 0;

  if (scannedNumber && cardNumber) {
    if (scannedNumber === cardNumber) score += 85;
    else if (scannedNumber.split("/")[0] === cardNumber.split("/")[0]) score += 65;
    else if (cardNumber.includes(scannedNumber) || scannedNumber.includes(cardNumber)) score += 42;
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
