import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const euro = (value?: number | null) => Number(value || 0) * 0.92;
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId") === "angele" ? "angele" : "adrien";

  try {
    const openings = await prisma.boosterOpening.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { cards: { include: { card: { select: { id: true, name: true, name_fr: true, imageUrl: true, usd: true, usd_foil: true, rarity: true } } } } },
    });

    const daily = new Map<string, { boosters: number; cards: number; value: number }>();
    const chapters = new Map<number, { chapter: number; boosters: number; cards: number; value: number }>();
    const pulls: Array<{ id: string; name: string; imageUrl: string | null; value: number; chapter: number; createdAt: Date; foil: boolean }> = [];
    let cards = 0;
    let foils = 0;
    let totalValue = 0;

    for (const opening of openings) {
      const date = dayKey(opening.createdAt);
      const day = daily.get(date) || { boosters: 0, cards: 0, value: 0 };
      const chapter = chapters.get(opening.chapter) || { chapter: opening.chapter, boosters: 0, cards: 0, value: 0 };
      day.boosters += 1;
      chapter.boosters += 1;

      for (const pull of opening.cards) {
        const value = pull.foil ? euro(pull.card.usd_foil || pull.card.usd) : euro(pull.card.usd);
        cards += 1;
        foils += Number(pull.foil);
        totalValue += value;
        day.cards += 1;
        day.value += value;
        chapter.cards += 1;
        chapter.value += value;
        pulls.push({ id: pull.cardId, name: pull.card.name_fr || pull.card.name || "Carte Lorcana", imageUrl: pull.card.imageUrl, value, chapter: opening.chapter, createdAt: opening.createdAt, foil: pull.foil });
      }
      daily.set(date, day);
      chapters.set(opening.chapter, chapter);
    }

    const recentDays = [...daily.entries()].slice(-14).map(([date, value]) => ({ date, ...value, value: Number(value.value.toFixed(2)) }));
    const byChapter = [...chapters.values()].map((value) => ({ ...value, value: Number(value.value.toFixed(2)), average: value.boosters ? Number((value.value / value.boosters).toFixed(2)) : 0 })).sort((a, b) => b.value - a.value);
    const bestPull = [...pulls].sort((a, b) => b.value - a.value)[0] || null;
    const latest = [...pulls].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);

    return NextResponse.json({
      totalOpenings: openings.length,
      cards,
      foils,
      totalValue: Number(totalValue.toFixed(2)),
      averagePerBooster: openings.length ? Number((totalValue / openings.length).toFixed(2)) : 0,
      averagePerCard: cards ? Number((totalValue / cards).toFixed(2)) : 0,
      bestPull,
      recentDays,
      byChapter,
      latest,
    });
  } catch (error) {
    console.error("BOOSTER INSIGHTS ERROR:", error);
    return NextResponse.json({ error: "Impossible de calculer les analyses des ouvertures." }, { status: 500 });
  }
}
