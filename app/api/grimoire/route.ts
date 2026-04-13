import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const userId = "test" // 👉 mets ton vrai user après

  const cards = await prisma.card.findMany({
    orderBy: [
      { setCode: "asc" },
      { collection_number: "asc" }
    ]
  })

  const collection = await prisma.collection.findMany({
    where: {
      userId
    }
  })

  const ownedMap = new Set(collection.map(c => c.cardId))

  const cardsWithOwned = cards.map(card => ({
    ...card,
    owned: ownedMap.has(card.id)
  }))

  const sets = [...new Set(cards.map(c => c.setCode))]

  return NextResponse.json({
    cards: cardsWithOwned,
    sets
  })
}