import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body =
      await req.json();

    const updatedDeck =
      await prisma.deck.update({
        where: {
          id: body.id,
        },

        data: {
          name: body.name,
          description:
            body.description,
        },
      });

    return NextResponse.json(
      updatedDeck
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Erreur modification deck",
      },
      {
        status: 500,
      }
    );
  }
}