import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  const existing = await prisma.deckCard.findFirst({
    where: {
      deckId: body.deckId,
      cardId: body.cardId,
    },
  });

  if (existing) {
    const updated = await prisma.deckCard.update({
      where: {
        id: existing.id,
      },

      data: {
        quantity: {
          increment: 1,
        },
      },
    });

    return NextResponse.json(updated);
  }

  const card = await prisma.deckCard.create({
    data: {
      deckId: body.deckId,
      cardId: body.cardId,
      quantity: 1,
    },
  });

  return NextResponse.json(card);
}