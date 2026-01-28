import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { fromUser, toUser, cardId, quantity } = await req.json();

  if (!fromUser || !toUser || !cardId) {
    return NextResponse.json({ ok: false, error: "Bad payload" }, { status: 400 });
  }
  if (fromUser === toUser) {
    return NextResponse.json({ ok: false, error: "fromUser === toUser" }, { status: 400 });
  }

  const q = Math.max(1, Number(quantity ?? 1));

  try {
    const result = await prisma.$transaction(async (tx) => {
      // s'assure que les users existent
      await tx.user.upsert({ where: { id: fromUser }, update: {}, create: { id: fromUser, name: fromUser } });
      await tx.user.upsert({ where: { id: toUser }, update: {}, create: { id: toUser, name: toUser } });

      // quantité actuelle donneur
      const fromRow = await tx.collection.findUnique({
        where: { userId_cardId: { userId: fromUser, cardId } },
        select: { quantity: true },
      });

      const fromQty = fromRow?.quantity ?? 0;
      if (fromQty < q) {
        return { ok: false, error: `Pas assez de copies: ${fromQty} dispo` };
      }

      // 1) décrémente donneur
      const newFrom = fromQty - q;
      if (newFrom === 0) {
        await tx.collection.deleteMany({ where: { userId: fromUser, cardId } });
      } else {
        await tx.collection.upsert({
          where: { userId_cardId: { userId: fromUser, cardId } },
          update: { quantity: newFrom },
          create: { userId: fromUser, cardId, quantity: newFrom },
        });
      }

      // 2) incrémente receveur
      const toRow = await tx.collection.findUnique({
        where: { userId_cardId: { userId: toUser, cardId } },
        select: { quantity: true },
      });
      const toQty = toRow?.quantity ?? 0;
      const newTo = toQty + q;

      await tx.collection.upsert({
        where: { userId_cardId: { userId: toUser, cardId } },
        update: { quantity: newTo },
        create: { userId: toUser, cardId, quantity: newTo },
      });

      // 3) log historique
      const trade = await tx.trade.create({
        data: { fromUser, toUser, cardId, quantity: q },
      });

      return { ok: true, tradeId: trade.id, fromQty: newFrom, toQty: newTo };
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
