import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cards = await prisma.card.findMany();

  console.log("NB CARTES :", cards.length);

  for (const card of cards) {
    console.log("INSERT :", card.name);

    await prisma.cardPrice.create({
      data: {
        cardId: card.id,
        price: "1.23",
      },
    });
  }

  console.log("✅ FINI");
}

main()
  .catch((e) => {
    console.error("❌ ERREUR :", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });