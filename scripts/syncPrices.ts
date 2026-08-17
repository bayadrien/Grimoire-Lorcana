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

const WRITE_CONCURRENCY = 12;
const FETCH_CONCURRENCY = 3;

type LorcastCard = {
  id: string;
  prices?: { usd?: string | number | null; usd_foil?: string | number | null };
};

type LorcastSet = { code: string };

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
) {
  const results: R[] = [];
  let cursor = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });

  await Promise.all(runners);
  return results;
}

async function fetchJson(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url} a répondu ${response.status}`);
  return response.json();
}

async function main() {
  console.log("💰 Sync des prix...");

  const setsJson = await fetchJson("https://api.lorcast.com/v0/sets");

  const sets: LorcastSet[] = setsJson.results || [];
  const chapters = sets.filter((set) => /^\d+$/.test(set.code));
  console.log(`📚 ${chapters.length} chapitres à relever`);

  const cardsByChapter = await mapWithConcurrency(chapters, FETCH_CONCURRENCY, async (s) => {
    console.log(`📦 Set ${s.code}`);
    const cards = await fetchJson(`https://api.lorcast.com/v0/sets/${s.code}/cards`);
    return Array.isArray(cards) ? (cards as LorcastCard[]).map((card) => ({ ...card, setCode: s.code })) : [];
  });

  const cards = cardsByChapter.flat();
  let updated = 0;
  let failed = 0;
  console.log(`💳 ${cards.length} cartes à mettre à jour`);

  await mapWithConcurrency(cards, WRITE_CONCURRENCY, async (card) => {
    const normal = Number(card.prices?.usd);
    const foil = Number(card.prices?.usd_foil);
    const priceUsd = Number.isFinite(normal) ? normal : null;
    const priceUsdFoil = Number.isFinite(foil) ? foil : null;

    try {
      await prisma.card.upsert({
        where: { id: card.id },
        update: { usd: priceUsd, usd_foil: priceUsdFoil },
        create: { id: card.id, name: "Unknown", setName: card.setCode, usd: priceUsd, usd_foil: priceUsdFoil },
      });
      updated++;
      if (updated % 100 === 0) console.log(`💰 ${updated}/${cards.length} cartes mises à jour`);
    } catch (error) {
      failed++;
      console.error(`❌ Carte ${card.id} ignorée`, error);
    }
  });

  console.log(`✅ ${updated} cartes mises à jour${failed ? ` · ${failed} ignorées` : ""}`);

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
