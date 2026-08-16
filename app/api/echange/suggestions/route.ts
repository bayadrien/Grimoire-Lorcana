import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const user = new URL(req.url).searchParams.get("userId") === "angele" ? "angele" : "adrien";
  const other = user === "adrien" ? "angele" : "adrien";
  const [mine, theirs] = await Promise.all([
    prisma.collection.findMany({ where: { userId: user }, include: { card: { select: { id: true, name: true, name_fr: true, imageUrl: true, setCode: true, collection_number: true, usd: true, usd_foil: true } } } }),
    prisma.collection.findMany({ where: { userId: other }, include: { card: { select: { id: true, name: true, name_fr: true, imageUrl: true, usd: true, usd_foil: true } } } }),
  ]);
  const mineQty = new Map<string, number>(); mine.forEach((row) => mineQty.set(row.cardId, (mineQty.get(row.cardId) || 0) + row.quantity));
  const theirQty = new Map<string, number>(); theirs.forEach((row) => theirQty.set(row.cardId, (theirQty.get(row.cardId) || 0) + row.quantity));
  const valueOf = (card: { usd?: number | null; usd_foil?: number | null }) => Number(Math.max(card.usd || 0, card.usd_foil || 0) * .92);
  const receives = theirs.filter((row) => (mineQty.get(row.cardId) || 0) === 0 && (theirQty.get(row.cardId) || 0) > 1).map((row) => row.card);
  const gives = mine.filter((row) => (theirQty.get(row.cardId) || 0) === 0 && (mineQty.get(row.cardId) || 0) > 1).map((row) => row.card);
  const matches = gives.flatMap((give) => receives.map((receive) => ({ give, receive, giveValue: valueOf(give), receiveValue: valueOf(receive) })))
    .sort((a, b) => Math.abs(a.giveValue - a.receiveValue) - Math.abs(b.giveValue - b.receiveValue))
    .slice(0, 3)
    .map((match) => ({ ...match, difference: Number(Math.abs(match.giveValue - match.receiveValue).toFixed(2)) }));
  return NextResponse.json({ user, other, receives: receives.slice(0, 6), gives: gives.slice(0, 6), matches, possible: matches.length });
}
