import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type ScanCard = { id: string; name: string | null; name_fr: string | null; collection_number: string | null; imageUrl: string | null; setCode: string | null; usd: number | null; usd_foil: number | null };

function normalise(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function numberParts(value: string) {
  const fractions = value.match(/\d{1,3}\s*\/\s*\d{1,3}/g) ?? [];
  const plain = value.match(/\d{1,3}/g) ?? [];
  return Array.from(new Set([...fractions.map((part) => part.replace(/\s/g, "")), ...plain.map((part) => String(Number(part)))]));
}

function cardNumberParts(value: string) {
  const fractions = value.match(/\d{1,3}\s*\/\s*\d{1,3}/g) ?? [];
  if (!fractions.length) return Array.from(new Set((value.match(/\d{1,3}/g) ?? []).map((part) => String(Number(part)))));
  return Array.from(new Set(fractions.flatMap((part) => {
    const clean = part.replace(/\s/g, "");
    return [clean, String(Number(clean.split("/")[0]))];
  })));
}

function scoreCard(card: ScanCard, number: string, name: string) {
  const scannedNumbers = numberParts(number);
  const cardNumbers = cardNumberParts(card.collection_number ?? "");
  const scannedName = normalise(name);
  const names = [card.name, card.name_fr].filter(Boolean).map((value) => normalise(value as string));
  let score = 0;
  for (const scannedNumber of scannedNumbers) for (const cardNumber of cardNumbers) {
    if (scannedNumber === cardNumber) score = Math.max(score, scannedNumber.includes("/") ? 82 : 62);
    else if (scannedNumber.includes("/") && cardNumber.includes("/") && scannedNumber.split("/")[0] === cardNumber.split("/")[0]) score = Math.max(score, 68);
  }
  if (scannedName) {
    const words = scannedName.split(" ").filter((word) => word.length > 2);
    const nameScore = Math.max(0, ...names.map((candidate) => candidate === scannedName ? 100 : (words.length ? (words.filter((word) => candidate.includes(word)).length / words.length) * 100 : 0)));
    score += nameScore * 0.48;
  }
  return Math.min(99, Math.round(score));
}

function summary(rows: { userId: string; quantity: number; variant: string }[], deckCards: { quantity: number; deck: { userId: string } }[], userId: string) {
  const ownRows = rows.filter((row) => row.userId === userId);
  const normal = ownRows.filter((row) => row.variant === "normal").reduce((sum, row) => sum + row.quantity, 0);
  const foil = ownRows.filter((row) => row.variant === "foil").reduce((sum, row) => sum + row.quantity, 0);
  const deckNeed = deckCards.filter((row) => row.deck.userId === userId).reduce((sum, row) => sum + row.quantity, 0);
  const total = normal + foil;
  const missingForDeck = Math.max(0, deckNeed - total);
  return { normal, foil, total, deckNeed, missingForDeck, status: total === 0 ? "missing" : missingForDeck > 0 ? "deck" : "enough" };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const number = searchParams.get("number")?.trim() ?? "";
    const name = searchParams.get("name")?.trim() ?? "";
    const chapter = searchParams.get("chapter")?.trim() ?? "";
    const chapterFilter = /^\d{1,2}$/.test(chapter) ? chapter : undefined;
    const userId = searchParams.get("userId") === "angele" ? "angele" : "adrien";
    const otherUserId = userId === "adrien" ? "angele" : "adrien";
    if (!number && !name) return NextResponse.json([]);

    const cards = await prisma.card.findMany({ where: chapterFilter ? { setCode: chapterFilter } : undefined, select: { id: true, name: true, name_fr: true, collection_number: true, imageUrl: true, setCode: true, usd: true, usd_foil: true } });
    const matches = cards.map((card) => ({ ...card, confidence: scoreCard(card, number, name) })).filter((card) => card.confidence >= 25).sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    if (!matches.length) return NextResponse.json([]);

    const details = await prisma.card.findMany({
      where: { id: { in: matches.map((card) => card.id) } },
      include: { collections: { where: { userId: { in: [userId, otherUserId] } }, select: { userId: true, quantity: true, variant: true } }, deckCards: { include: { deck: { select: { userId: true } } } } },
    });
    const byId = new Map(details.map((card) => [card.id, card]));
    return NextResponse.json(matches.map((match) => {
      const card = byId.get(match.id)!;
      return {
        ...match,
        price: { normal: Number(((match.usd ?? 0) * 0.92).toFixed(2)), foil: Number(((match.usd_foil ?? match.usd ?? 0) * 0.92).toFixed(2)) },
        mine: summary(card.collections, card.deckCards, userId),
        other: summary(card.collections, card.deckCards, otherUserId),
        otherName: otherUserId === "angele" ? "Angèle" : "Adrien",
      };
    }));
  } catch (error) {
    console.error("MARKET SCAN ERROR:", error);
    return NextResponse.json({ error: "Erreur pendant la recherche." }, { status: 500 });
  }
}
