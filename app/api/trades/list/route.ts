import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "all";
  const to = url.searchParams.get("to") || "all";

  const where: any = {};
  if (from !== "all") where.fromUser = from;
  if (to !== "all") where.toUser = to;

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { card: true },
  });

  return NextResponse.json(trades);
}
