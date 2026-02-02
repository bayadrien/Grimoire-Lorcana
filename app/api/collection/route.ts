import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json([], { status: 200 });
  }

  const rows = await prisma.collection.findMany({
    where: { userId },
    select: {
      cardId: true,
      variant: true,
      quantity: true,
    },
  });

  return NextResponse.json(rows);
}
