import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
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

  return NextResponse.json(cards);
}