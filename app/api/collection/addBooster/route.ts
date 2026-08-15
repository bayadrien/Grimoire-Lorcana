import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Variant } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { userId, cards } = await req.json();

    if (!userId || !Array.isArray(cards)) {
      return NextResponse.json(
        { ok: false, error: "Données du booster invalides." },
        { status: 400 }
      );
    }

    // Une carte normale et une carte foil sont deux entrées distinctes.
    const grouped = new Map<
      string,
      { cardId: string; variant: Variant; quantity: number }
    >();

    for (const card of cards) {
      if (!card?.id) {
        return NextResponse.json(
          { ok: false, error: "Une carte du booster est invalide." },
          { status: 400 }
        );
      }

      const variant = card.foil ? Variant.foil : Variant.normal;
      const key = `${card.id}:${variant}`;
      const current = grouped.get(key);

      grouped.set(key, {
        cardId: card.id,
        variant,
        quantity: (current?.quantity ?? 0) + 1,
      });
    }

    await Promise.all(
      Array.from(grouped.values()).map(({ cardId, variant, quantity }) =>
        prisma.collection.upsert({
          where: {
            userId_cardId_variant_isEnglish: {
              userId,
              cardId,
              variant,
              isEnglish: false,
            },
          },
          update: {
            quantity: { increment: quantity },
          },
          create: {
            userId,
            cardId,
            variant,
            isEnglish: false,
            quantity,
          },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ADD BOOSTER ERROR =", error);

    return NextResponse.json(
      { ok: false, error: "Impossible d'ajouter les cartes à la collection." },
      { status: 500 }
    );
  }
}
