import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const API_URL = "https://api.lorcana-api.com/cards/all";

async function main() {
  const { data } = await axios.get(API_URL);

  const dbCards = await prisma.card.findMany({
    where: {
      collection_number: { not: null },
    },
  });

  let matched = 0;

  for (const card of dbCards) {
    const dbNumber = card.collection_number?.split("/")[0];

    const match = data.find(
      (c) => c.collector_number == dbNumber
    );

    if (!match) {
      console.log("❌", card.name, card.collection_number);
      continue;
    }

    await prisma.card.update({
      where: { id: card.id },
      data: {
        externalId: match.id,
      },
    });

    console.log(
      "✅",
      card.name,
      `[${dbNumber}] →`,
      match.name
    );

    matched++;
  }

  console.log(`🎯 MATCHÉS : ${matched}/${dbCards.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());