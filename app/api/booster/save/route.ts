import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, chapter, boosterImage, cards } = body;

    const totalValue = cards.reduce(
      (sum: number, c: any) => sum + (c.price || 0),
      0
    );

    // 🔹 1. créer l'opening
    const opening = await prisma.boosterOpening.create({
      data: {
        userId,
        chapter: Number(chapter),
        boosterImage,
        totalValue: totalValue || 0,
      },
    });

    // 🔹 2. créer les cartes (séparément)
    await prisma.boosterCard.createMany({
      data: cards.map((c: any) => ({
        openingId: opening.id,
        cardId: c.id,
        foil: c.foil || false,
      })),
    });

    return NextResponse.json({ id: opening.id });

  } catch (err) {
    console.error("❌ Booster save error:", err);

    return NextResponse.json(
      { error: "Erreur création booster" },
      { status: 500 }
    );
  }
}