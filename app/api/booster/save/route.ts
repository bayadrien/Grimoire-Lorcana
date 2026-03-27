import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const { userId, chapter, boosterImage, cards } = body;

  const totalValue = cards.reduce(
    (sum: number, c: any) => sum + (c.price || 0),
    0
  );

  const opening = await prisma.boosterOpening.create({
    data: {
      userId,
      chapter: Number(chapter),
      boosterImage,
      totalValue: totalValue || 0,
      cards: {
        create: cards.map((c: any) => ({
          cardId: c.id,
          foil: c.foil || false,
        })),
      },
    },
  });

  return NextResponse.json({ id: opening.id });
}