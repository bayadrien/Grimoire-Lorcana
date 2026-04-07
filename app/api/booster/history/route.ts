import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const openings = await prisma.boosterOpening.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      include: {
        cards: {
          include: {
            card: true, // 🔥 récupère les données (usd, image, etc)
          },
        },
      },
    });

    return NextResponse.json(openings);
  } catch (error) {
    console.error("HISTORY ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}