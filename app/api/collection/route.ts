import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "adrien";

  const rows = await prisma.collection.findMany({
    where: { userId },
  });

  return NextResponse.json(rows);
}
