import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await context.params;

  const { searchParams } = new URL(req.url);

  const userId =
    searchParams.get("user") || "adrien";

  const deck = await prisma.deck.findUnique({
    where: {
      id: params.id,
    },

    include: {
      cards: {
        include: {
          card: {
            include: {
              collections: {
                where: {
                  userId,
                  variant: "normal",
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(deck);
}