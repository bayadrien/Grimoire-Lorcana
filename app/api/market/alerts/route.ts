import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const euro = (value: number) => Number((value * 0.92).toFixed(2));

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId") === "angele" ? "angele" : "adrien";
  try {
    const rows = await prisma.collection.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: {
        card: {
          select: {
            id: true, name: true, name_fr: true, imageUrl: true, setCode: true, collection_number: true, usd: true, usd_foil: true,
            priceHistory: { select: { normalEur: true, foilEur: true, recordedAt: true }, orderBy: { recordedAt: "desc" }, take: 2 },
          },
        },
      },
    });

    const alerts = rows.flatMap((row) => {
      const history = row.card.priceHistory;
      if (history.length < 2) return [];
      const current = Math.max(history[0].normalEur, history[0].foilEur);
      const previous = Math.max(history[1].normalEur, history[1].foilEur);
      if (!previous) return [];
      const change = ((current - previous) / previous) * 100;
      if (Math.abs(change) < 8) return [];
      return [{ id: row.cardId, name: row.card.name_fr || row.card.name || "Carte Lorcana", imageUrl: row.card.imageUrl, setCode: row.card.setCode, collectionNumber: row.card.collection_number, quantity: row.quantity, current: euro(current), change: Number(change.toFixed(1)), recordedAt: history[0].recordedAt }];
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("MARKET ALERTS ERROR:", error);
    return NextResponse.json({ error: "Impossible de charger les alertes de prix." }, { status: 500 });
  }
}
