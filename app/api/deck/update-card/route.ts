import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  const deckCard = await prisma.deckCard.findUnique({
    where: {
      id: body.deckCardId,
    },
  });

  if (!deckCard) {
    return NextResponse.json(
      { error: "Carte introuvable" },
      { status: 404 }
    );
  }

  const newQuantity =
    body.action === "increment"
      ? deckCard.quantity + 1
      : deckCard.quantity - 1;

  if (newQuantity <= 0) {
    await prisma.deckCard.delete({
      where: {
        id: deckCard.id,
      },
    });

    return NextResponse.json({
      deleted: true,
    });
  }

  const updated = await prisma.deckCard.update({
    where: {
      id: deckCard.id,
    },

    data: {
      quantity: newQuantity,
    },
  });

  return NextResponse.json(updated);
}