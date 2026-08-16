import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const euro = (value?: number | null) => Number(value || 0) * .92;

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId") === "angele" ? "angele" : "adrien";
  const other = userId === "adrien" ? "angele" : "adrien";
  try {
    const [latestOpening, mine, theirs] = await Promise.all([
      prisma.boosterOpening.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, include: { cards: { include: { card: { select: { id: true, name: true, name_fr: true, imageUrl: true, usd: true, usd_foil: true } } } } } }),
      prisma.collection.findMany({ where: { userId, quantity: { gt: 0 } }, include: { card: { select: { id: true, name: true, name_fr: true, imageUrl: true } } } }),
      prisma.collection.findMany({ where: { userId: other, quantity: { gt: 0 } } }),
    ]);

    const notifications: Array<{ id:string; icon:string; title:string; text:string; href:string; createdAt:Date }> = [];
    if (latestOpening) {
      const value = latestOpening.cards.reduce((sum, pull) => sum + (pull.foil ? euro(pull.card.usd_foil || pull.card.usd) : euro(pull.card.usd)), 0);
      notifications.push({ id: `opening-${latestOpening.id}`, icon: "🎁", title: "Dernier booster enregistré", text: `${latestOpening.cards.length} cartes · ${value.toLocaleString("fr-FR", { style:"currency", currency:"EUR" })}`, href: `/opening/history/${latestOpening.id}`, createdAt: latestOpening.createdAt });
    }
    const theirQty = new Map<string, number>(); theirs.forEach((row) => theirQty.set(row.cardId, (theirQty.get(row.cardId) || 0) + row.quantity));
    const useful = mine.find((row) => row.quantity > 1 && (theirQty.get(row.cardId) || 0) === 0);
    if (useful) notifications.push({ id: `trade-${useful.cardId}`, icon: "🤝", title: "Échange possible", text: `${useful.card.name_fr || useful.card.name || "Une carte"} est un doublon utile pour ${other === "angele" ? "Angèle" : "Adrien"}.`, href: "/echange", createdAt: new Date() });

    return NextResponse.json({ notifications: notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) });
  } catch (error) {
    console.error("NOTIFICATIONS ERROR:", error);
    return NextResponse.json({ notifications: [] }, { status: 200 });
  }
}
