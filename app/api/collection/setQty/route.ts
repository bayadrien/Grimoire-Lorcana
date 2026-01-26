import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId, cardId, quantity } = await req.json();

  if (!userId || !cardId || typeof quantity !== "number") {
    return NextResponse.json({ ok: false, error: "Bad payload" }, { status: 400 });
  }

  // S'assure que l'utilisateur existe (utile en prod)
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name: userId },
  });

  const q = Math.max(0, quantity);

  if (q === 0) {
    await prisma.collection.deleteMany({
      where: { userId, cardId },
    });
    return NextResponse.json({ ok: true, quantity: 0 });
  }

  await prisma.collection.upsert({
    where: { userId_cardId: { userId, cardId } },
    update: { quantity: q },
    create: { userId, cardId, quantity: q },
  });

  return NextResponse.json({ ok: true, quantity: q });
}
