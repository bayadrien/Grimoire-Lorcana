import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId, cardId, quantity } = await req.json();

  const q = Math.max(0, Number(quantity) || 0);

  const row = await prisma.collection.upsert({
    where: { userId_cardId: { userId, cardId } },
    update: { quantity: q },
    create: { userId, cardId, quantity: q },
  });

  return NextResponse.json(row);
}
