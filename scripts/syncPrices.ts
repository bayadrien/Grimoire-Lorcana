/*
  ==========================================================
  MISE À JOUR DES PRIX LORCANA
  ==========================================================

  Pour lancer la synchronisation, ouvre un terminal dans le
  dossier du projet puis exécute :

    npx ts-node scripts/syncPrices.ts

  Le script récupère les prix normaux et foil depuis Lorcast,
  puis met à jour les colonnes `usd` et `usd_foil` des cartes.
  Il ne modifie pas la collection ni les boosters ouverts.

  Prérequis : être connecté à Internet et garder le fichier
  `.env` du projet (il contient la connexion à la base).
*/

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

  // Conserve un relevé quotidien uniquement pour les cartes présentes dans
  // les collections : les courbes et alertes ne grossissent pas inutilement.
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const owned = await prisma.collection.findMany({ where: { quantity: { gt: 0 } }, select: { cardId: true } });
  const cardIds = [...new Set(owned.map((row) => row.cardId))];
  const existing = await prisma.priceHistory.findMany({ where: { cardId: { in: cardIds }, recordedAt: day }, select: { cardId: true } });
  const known = new Set(existing.map((row) => row.cardId));
  const prices = await prisma.card.findMany({ where: { id: { in: cardIds.filter((id) => !known.has(id)) } }, select: { id: true, usd: true, usd_foil: true } });
  if (prices.length) {
    await prisma.priceHistory.createMany({ data: prices.map((card) => ({ cardId: card.id, normalEur: Number(((card.usd || 0) * .92).toFixed(2)), foilEur: Number(((card.usd_foil || card.usd || 0) * .92).toFixed(2)), recordedAt: day })) });
  }
  console.log(`📈 ${prices.length} relevés de prix enregistrés`);

  console.log("🎉 Prix terminés");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
