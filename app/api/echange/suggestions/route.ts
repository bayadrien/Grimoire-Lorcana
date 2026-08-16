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
  const wants = theirs.filter((row) => (mineQty.get(row.cardId) || 0) === 0 && (theirQty.get(row.cardId) || 0) > 1).slice(0, 6).map((row) => row.card);
  const gives = mine.filter((row) => (theirQty.get(row.cardId) || 0) === 0 && (mineQty.get(row.cardId) || 0) > 1).slice(0, 6).map((row) => row.card);
  return NextResponse.json({ user, other, receives: wants, gives, possible: Math.min(wants.length, gives.length) });
}
