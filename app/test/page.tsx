"use client"

import { useEffect, useState } from "react"
import CardSlot from "../components/CardSlot"

type Card = {
  id: string
  name: string
  imageUrl: string
  setCode: string
  setName: string
  collection_number: number
  owned: boolean
}

export default function GrimoirePage() {
  const [cards, setCards] = useState<Card[]>([])
  const [sets, setSets] = useState<string[]>([])
  const [selectedSet, setSelectedSet] = useState<string>("")
  const [page, setPage] = useState(0)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const res = await fetch("/api/grimoire")
    const data = await res.json()

    setCards(data.cards)
    setSets(data.sets)
    setSelectedSet(data.sets[0])
  }

  if (!selectedSet) {
    return <div className="p-10 text-center">Chargement...</div>
  }

  const chapterCards = cards.filter(c => c.setCode === selectedSet)

  // 📖 Pagination
  const cardsPerPage = 18
  const start = page * cardsPerPage
  const currentCards = chapterCards.slice(start, start + cardsPerPage)

  const leftPage = currentCards.slice(0, 9)
  const rightPage = currentCards.slice(9, 18)

  const maxPage = Math.floor((chapterCards.length - 1) / cardsPerPage)

  return (
    <div className="min-h-screen bg-[#f5efe6] p-6">

      {/* 🏷️ ONGLETS */}
      <div className="flex justify-center gap-2 mb-8 overflow-x-auto">
        {sets.map(set => (
          <button
            key={set}
            onClick={() => {
              setSelectedSet(set)
              setPage(0)
            }}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              set === selectedSet
                ? "bg-[#e8dccb] shadow"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {set}
          </button>
        ))}
      </div>

      {/* 📖 LIVRE */}
      <div className="flex justify-center">

        <div className="relative bg-[#e8dccb] p-8 rounded-2xl shadow-2xl flex gap-10">

          {/* RELIURE */}
          <div className="absolute left-1/2 top-0 h-full w-[3px] bg-[#cbbfa8] rounded-full" />

          {/* PAGE GAUCHE */}
          <div className="grid grid-cols-3 gap-4">
            {leftPage.map(card => (
              <CardSlot key={card.id} card={card} />
            ))}
          </div>

          {/* PAGE DROITE */}
          <div className="grid grid-cols-3 gap-4">
            {rightPage.map(card => (
              <CardSlot key={card.id} card={card} />
            ))}
          </div>

        </div>

      </div>

      {/* 📄 PAGINATION */}
      <div className="flex justify-center items-center gap-6 mt-8">

        <button
          onClick={() => setPage(p => Math.max(p - 1, 0))}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          ⬅️
        </button>

        <span className="font-semibold">
          Page {page + 1} / {maxPage + 1}
        </span>

        <button
          onClick={() => setPage(p => Math.min(p + 1, maxPage))}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          ➡️
        </button>

      </div>

    </div>
  )
}