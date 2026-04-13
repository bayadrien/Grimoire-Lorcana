type Props = {
  card: {
    id: string
    name: string
    imageUrl: string
    collection_number: number
    owned: boolean
  }
}

export default function CardSlot({ card }: Props) {
  return (
    <div className="w-[95px]">

      {!card.owned ? (
        <div className="aspect-[2.5/3.5] bg-[#2c3e50] rounded-md flex flex-col items-center justify-center text-white border border-[#1a252f]">

          <span className="text-[10px] opacity-70">
            {card.collection_number}/204
          </span>

          <span className="text-xl">?</span>

        </div>
      ) : (
        <img
          src={card.imageUrl}
          alt={card.name}
          className="rounded-md aspect-[2.5/3.5] object-cover shadow"
        />
      )}

    </div>
  )
}