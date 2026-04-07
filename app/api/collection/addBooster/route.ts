import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Variant } from "@prisma/client";

export async function POST(req: Request) {
  console.log("🔥 ADD BOOSTER CALLED");

  const { userId, cards } = await req.json();

  if (!userId || !Array.isArray(cards)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // 🔹 Grouper cartes
  const grouped: Record<string, number> = {};

  for (const c of cards) {
    grouped[c.id] = (grouped[c.id] || 0) + 1;
  }

  // 🔹 Traiter chaque carte
  await Promise.all(
    Object.entries(grouped).map(async ([cardId, qty]) => {
      await prisma.collection.upsert({
        where: {
          userId_cardId_variant: {
            userId,
            cardId,
            variant: Variant.normal,
          },
        },
        update: {
          quantity: {
            increment: qty,
          },
        },
        create: {
          userId,
          cardId,
          variant: Variant.normal,
          quantity: qty,
        },
      });
    })
  );

  return NextResponse.json({ ok: true });
}