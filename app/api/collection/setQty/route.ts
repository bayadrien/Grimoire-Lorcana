import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId, cardId, variant, quantity } = await req.json();

  // 🔒 Validation
  if (
    !userId ||
    !cardId ||
    (variant !== "normal" && variant !== "foil") ||
    typeof quantity !== "number"
  ) {
    return NextResponse.json(
      { ok: false, error: "Bad payload" },
      { status: 400 }
    );
  }

  // 👤 S'assurer que l'utilisateur existe
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name: userId },
  });

  const q = Math.max(0, quantity);

  // 🔍 Cherche la ligne existante
  const existing = await prisma.collection.findFirst({
    where: {
      userId,
      cardId,
      variant,
    },
  });

  // 🗑️ Quantité = 0 → supprimer UNIQUEMENT cette variante
  if (q === 0) {
    if (existing) {
      await prisma.collection.delete({
        where: {
          userId_cardId_variant: {
            userId,
            cardId,
            variant,
          },
        },
      });
    }

    return NextResponse.json({
      ok: true,
      cardId,
      variant,
      quantity: 0,
    });
  }

  // ✏️ Update ou Create
  if (existing) {
    await prisma.collection.update({
      where: {
        userId_cardId_variant: {
          userId,
          cardId,
          variant,
        },
      },
      data: {
        quantity: q,
      },
    });
  } else {
    await prisma.collection.create({
      data: {
        userId,
        cardId,
        variant,
        quantity: q,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    cardId,
    variant,
    quantity: q,
  });
}
