import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q =
      searchParams
        .get("q")
        ?.toLowerCase() || "";

    // MULTI FILTERS
    const chapters =
      searchParams.getAll(
        "chapter"
      );

    const inks =
      searchParams.getAll(
        "ink"
      );

    const cards =
      await prisma.card.findMany({
        where: {
          AND: [
            // CHAPTERS
            chapters.length > 0
              ? {
                  setCode: {
                    in: chapters,
                  },
                }
              : {},

            // INKS
            inks.length > 0
              ? {
                  ink: {
                    in: inks,
                  },
                }
              : {},

            // SEARCH
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
                      name_fr: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },

                    {
                      collection_number:
                        {
                          contains: q,
                        },
                    },
                  ],
                }
              : {},
          ],
        },
      });

    return NextResponse.json(
      cards ?? []
    );
  } catch (error) {
    console.error(
      "API CARDS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erreur serveur cards",
      },
      { status: 500 }
    );
  }
}