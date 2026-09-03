import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function userIdFrom(value: string | null) {
  return value === "angele" ? "angele" : "adrien";
}

export async function GET(req: Request) {
  try {
    const userId = userIdFrom(new URL(req.url).searchParams.get("userId"));
    const [places, sessions] = await Promise.all([
      prisma.openingPlace.findMany({
        where: { userId },
        orderBy: [{ lastUsedAt: "desc" }, { useCount: "desc" }],
        take: 10,
      }),
      prisma.openingSession.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 12,
        include: { place: true, _count: { select: { openings: true } } },
      }),
    ]);
    return NextResponse.json({ places, sessions });
  } catch (error) {
    console.error("OPENING METADATA ERROR:", error);
    return NextResponse.json({ error: "Impossible de charger les sessions." }, { status: 500 });
  }
}
