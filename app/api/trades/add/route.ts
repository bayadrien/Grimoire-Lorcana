import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { fromUser, toUser, cardId, quantity } = await req.json();

  if (!fromUser || !toUser || !cardId) {
    return NextResponse.json({ ok: false, error: "Bad payload" }, { status: 400 });
  }

  const q = Math.max(1, Number(quantity ?? 1));

  const trade = await prisma.trade.create({
    data: {
      fromUser,
      toUser,
      cardId,
      quantity: q,
    },
  });

  return NextResponse.json({ ok: true, tradeId: trade.id });
}
