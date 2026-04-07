import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const opening = await prisma.boosterOpening.findUnique({
      where: { id },
      include: {
        cards: {
          include: {
            card: true,
          },
        },
      },
    });

    if (!opening) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ================== COLLECTION AVANT CE BOOSTER ==================
    const previousCards = await prisma.boosterCard.findMany({
      where: {
        opening: {
          userId: opening.userId,
          createdAt: {
            lt: opening.createdAt, // 🔥 uniquement les boosters AVANT
          },
        },
      },
      select: {
        cardId: true,
      },
    });

    // 🧠 On compte combien le joueur avait de chaque carte AVANT
    const collectionMap: Record<string, number> = {};

    previousCards.forEach((c) => {
      collectionMap[c.cardId] = (collectionMap[c.cardId] || 0) + 1;
    });

    // ================== ENRICH CARDS ==================
    const enrichedCards = opening.cards.map((c) => {
      const qtyBefore = collectionMap[c.cardId] || 0;

      return {
        ...c,
        alreadyOwned: qtyBefore > 0,   // AVANT ouverture
        quantityOwned: qtyBefore,      // combien il en avait
        isPlaysetFull: qtyBefore >= 4, // playset complet
      };
    });

    // ================== RETURN ==================
    return NextResponse.json({
      ...opening,
      cards: enrichedCards,
    });

  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}