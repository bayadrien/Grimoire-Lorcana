import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const today = () => { const value = new Date(); value.setHours(0, 0, 0, 0); return value; };

export async function POST(req: Request) {
  const userId = (await req.json().catch(() => ({}))).userId === "angele" ? "angele" : "adrien";
  try {
    const day = today();
    const rows = await prisma.collection.findMany({ where: { userId, quantity: { gt: 0 } }, select: { cardId: true } });
    const cardIds = [...new Set(rows.map((row) => row.cardId))];
    if (!cardIds.length) return NextResponse.json({ created: 0 });
    const existing = await prisma.priceHistory.findMany({ where: { cardId: { in: cardIds }, recordedAt: day }, select: { cardId: true } });
    const known = new Set(existing.map((row) => row.cardId));
    const cards = await prisma.card.findMany({ where: { id: { in: cardIds.filter((id) => !known.has(id)) } }, select: { id: true, usd: true, usd_foil: true } });
    await prisma.priceHistory.createMany({ data: cards.map((card) => ({ cardId: card.id, normalEur: Number(((card.usd || 0) * .92).toFixed(2)), foilEur: Number(((card.usd_foil || card.usd || 0) * .92).toFixed(2)), recordedAt: day })) });
    return NextResponse.json({ created: cards.length });
  } catch (error) {
    console.error("PRICE SNAPSHOT ERROR:", error);
    return NextResponse.json({ error: "Impossible d’enregistrer les prix du jour." }, { status: 500 });
  }
}
