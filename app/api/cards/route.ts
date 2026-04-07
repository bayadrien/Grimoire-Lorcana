import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.toLowerCase() || "";
    const chapter = searchParams.get("chapter");

    const cards = await prisma.card.findMany({
      where: {
        AND: [
          chapter ? { setCode: String(chapter) } : {},
          q
            ? {
                OR: [
                  {
                    name: {
                      contains: q,
                      mode: "insensitive",
                    },
                  },
                  {
                    collection_number: {
                      contains: q,
                    },
                  },
                ],
              }
            : {},
        ],
      },
    });

    return NextResponse.json(cards ?? []);
  } catch (error) {
    console.error("API CARDS ERROR:", error);

    return NextResponse.json(
      { error: "Erreur serveur cards" },
      { status: 500 }
    );
  }
}