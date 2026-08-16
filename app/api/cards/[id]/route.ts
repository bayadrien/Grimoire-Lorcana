import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const euro = (value?: number | null) => Number(value || 0) * 0.92;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = new URL(req.url).searchParams.get("userId") === "angele" ? "angele" : "adrien";
  try {
    const card = await prisma.card.findUnique({ where: { id } });
    if (!card) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
    const otherUserId = userId === "adrien" ? "angele" : "adrien";
    const [collection, otherCollection, openings, deckCards, availableDecks, trades, related, priceHistory] = await Promise.all([
      prisma.collection.findMany({ where: { cardId: id, userId }, select: { quantity: true, variant: true, isEnglish: true } }),
      prisma.collection.findMany({ where: { cardId: id, userId: otherUserId }, select: { quantity: true } }),
      prisma.boosterCard.findMany({ where: { cardId: id, opening: { userId } }, orderBy: { opening: { createdAt: "asc" } }, include: { opening: { select: { id: true, chapter: true, boosterImage: true, createdAt: true } } } }),
      prisma.deckCard.findMany({ where: { cardId: id, deck: { userId } }, include: { deck: { select: { id: true, name: true, inks: true } } } }),
      prisma.deck.findMany({ where: { userId }, select: { id: true, name: true, inks: true }, orderBy: { createdAt: "desc" } }),
      prisma.trade.findMany({ where: { cardId: id }, orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.card.findMany({ where: { setCode: card.setCode, id: { not: id } }, take: 4, select: { id: true, name: true, name_fr: true, imageUrl: true, collection_number: true, rarity: true } }),
      prisma.priceHistory.findMany({ where: { cardId: id }, orderBy: { recordedAt: "asc" }, take: 90, select: { normalEur: true, foilEur: true, recordedAt: true } }),
    ]);
    const normal = collection.filter((row) => row.variant === "normal").reduce((sum, row) => sum + row.quantity, 0);
    const foil = collection.filter((row) => row.variant === "foil").reduce((sum, row) => sum + row.quantity, 0);
    const normalPrice = euro(card.usd);
    const foilPrice = euro(card.usd_foil) || normalPrice;
    return NextResponse.json({ card, collection: { normal, foil, total: normal + foil, otherTotal: otherCollection.reduce((sum, row) => sum + row.quantity, 0), otherName: otherUserId === "angele" ? "Angèle" : "Adrien", english: collection.some((row) => row.isEnglish), unitValue: Number(Math.max(normalPrice, foilPrice).toFixed(2)), estimatedValue: Number((normal * normalPrice + foil * foilPrice).toFixed(2)) }, openings: { count: openings.length, first: openings[0] || null, latest: openings.slice(-5).reverse() }, decks: deckCards.map((entry) => ({ ...entry.deck, quantity: entry.quantity })), availableDecks, trades, related, priceHistory });
  } catch (error) {
    console.error("CARD DETAIL ERROR:", error);
    return NextResponse.json({ error: "Impossible de charger cette fiche carte." }, { status: 500 });
  }
}
