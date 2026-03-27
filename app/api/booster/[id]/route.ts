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

    // ================== COLLECTION USER ==================
    const userCollection = await prisma.collection.findMany({
      where: { userId: opening.userId },
    });

    const collectionMap: Record<string, number> = {};

    userCollection.forEach((c) => {
      collectionMap[c.cardId] = c.quantity;
    });

    // ================== ENRICH CARDS ==================
    const enrichedCards = opening.cards.map((c) => {
      const qty = collectionMap[c.cardId] || 0;

      return {
        ...c,
        alreadyOwned: qty > 0,      // carte déjà possédée
        quantityOwned: qty,         // combien il en a
        isPlaysetFull: qty >= 4,    // utile si tu veux gérer les "vrais doublons"
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