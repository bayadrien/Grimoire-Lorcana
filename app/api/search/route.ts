import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const userId = url.searchParams.get("userId") === "angele" ? "angele" : "adrien";
  if (q.length < 2) return NextResponse.json({ cards: [] });
  const cards = await prisma.card.findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { name_fr: { contains: q, mode: "insensitive" } }, { collection_number: { contains: q } }] }, take: 9, select: { id: true, name: true, name_fr: true, imageUrl: true, setCode: true, collection_number: true, ink: true, rarity: true } });
  const quantities = await prisma.collection.findMany({ where: { userId, cardId: { in: cards.map((card) => card.id) } }, select: { cardId: true, quantity: true } });
  const owned = new Map<string, number>(); quantities.forEach((row) => owned.set(row.cardId, (owned.get(row.cardId) || 0) + row.quantity));
  return NextResponse.json({ cards: cards.map((card) => ({ ...card, quantity: owned.get(card.id) || 0 })) });
}
