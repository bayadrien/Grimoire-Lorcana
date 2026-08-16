import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Transfer = { fromUser: string; toUser: string; cardId: string };

export async function POST(request: Request) {
  const { give, receive } = await request.json() as { give?: Transfer; receive?: Transfer };
  if (!give || !receive || !give.fromUser || !give.toUser || !give.cardId || !receive.cardId || give.fromUser !== receive.toUser || give.toUser !== receive.fromUser || give.cardId === receive.cardId) {
    return NextResponse.json({ ok: false, error: "Échange invalide." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const transfer = async (item: Transfer) => {
        const source = await tx.collection.findFirst({ where: { userId: item.fromUser, cardId: item.cardId, quantity: { gt: 0 } }, orderBy: { quantity: "desc" } });
        if (!source) throw new Error("Une des cartes n’est plus disponible dans la collection.");

        if (source.quantity === 1) {
          await tx.collection.deleteMany({ where: { userId: source.userId, cardId: source.cardId, variant: source.variant, isEnglish: source.isEnglish } });
        } else {
          await tx.collection.updateMany({ where: { userId: source.userId, cardId: source.cardId, variant: source.variant, isEnglish: source.isEnglish }, data: { quantity: { decrement: 1 } } });
        }

        const target = await tx.collection.findFirst({ where: { userId: item.toUser, cardId: item.cardId, variant: source.variant, isEnglish: source.isEnglish } });
        if (target) {
          await tx.collection.updateMany({ where: { userId: target.userId, cardId: target.cardId, variant: target.variant, isEnglish: target.isEnglish }, data: { quantity: { increment: 1 } } });
        } else {
          await tx.collection.create({ data: { userId: item.toUser, cardId: item.cardId, quantity: 1, variant: source.variant, isEnglish: source.isEnglish } });
        }
        await tx.trade.create({ data: { fromUser: item.fromUser, toUser: item.toUser, cardId: item.cardId, quantity: 1 } });
      };

      await transfer(give);
      await transfer(receive);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échange impossible.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
