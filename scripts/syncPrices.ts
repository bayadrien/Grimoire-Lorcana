import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("💰 Sync des prix...");

  const setsRes = await fetch("https://api.lorcast.com/v0/sets");
  const setsJson = await setsRes.json();

  const sets = setsJson.results || [];

  for (const s of sets.filter((x: any) => /^\d+$/.test(x.code))) {
    console.log(`📦 Set ${s.code}`);

    const res = await fetch(`https://api.lorcast.com/v0/sets/${s.code}/cards`);
    const cards = await res.json();

    if (!Array.isArray(cards)) continue;

    let count = 0;

    for (const c of cards) {
      const priceUsd =
        c.prices?.usd && !isNaN(Number(c.prices.usd))
          ? Number(c.prices.usd)
          : null;

      const priceUsdFoil =
        c.prices?.usd_foil != null ? Number(c.prices.usd_foil) : null;

      try {
        await prisma.card.upsert({
          where: { id: c.id },
          update: {
            usd: priceUsd,
            usd_foil: priceUsdFoil,
          },
          create: {
            id: c.id,
            name: "Unknown",
            setName: s.code,
            usd: priceUsd,
            usd_foil: priceUsdFoil,
          },
        });

        count++;

        if (count % 20 === 0) {
          console.log(`💰 ${count} maj`);
          await sleep(50);
        }
      } catch (err) {
        console.log("❌ Erreur carte:", c.id);
        console.log(err);
      }
    }
  }

  console.log("🎉 Prix terminés");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());