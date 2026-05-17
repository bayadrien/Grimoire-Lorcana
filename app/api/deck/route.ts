import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const userId =
    searchParams.get("user") || "adrien";

  const decks = await prisma.deck.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(decks);
}

export async function POST(req: Request) {
  const body = await req.json();

  const deck = await prisma.deck.create({
    data: {
      name: body.name,
      description: body.description,
      inks: body.inks,
      userId: body.userId,
    },
  });

  return NextResponse.json(deck);
}