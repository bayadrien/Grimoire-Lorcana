/*
  Recherche les cartes ajoutées tardivement dans les chapitres déjà connus.

  Commandes :
    npm run sync:new-cards
    npm run sync:new-cards -- --dry-run
    npm run sync:new-cards -- 14
    npm run sync:new-cards -- 12 13 14 --dry-run

  Le script ajoute uniquement les identifiants Lorcast absents de Card_new.
  Il ne met à jour aucune carte existante et ne touche jamais aux collections,
  decks, échanges ou historiques d'ouverture.
*/

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_ROOT = "https://api.lorcast.com/v0";

type LorcastSet = {
  code: string;
  name: string;
};

type LorcastCard = {
  id: string;
  name: string;
  collector_number?: string | null;
  text?: string | null;
  rarity?: string | null;
  ink?: string | null;
  type?: string[] | null;
  set?: { code: string; name: string } | null;
  image_uris?: { digital?: { normal?: string | null } | null } | null;
  prices?: {
    usd?: string | number | null;
    usd_foil?: string | number | null;
  } | null;
};

function numericPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`${url} a répondu ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function readArguments() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const invalid = args.filter((arg) => arg !== "--dry-run" && !/^\d+$/.test(arg));

  if (invalid.length) {
    throw new Error(`Argument invalide : ${invalid.join(", ")}`);
  }

  const requestedCodes = new Set(args.filter((arg) => /^\d+$/.test(arg)));
  return { dryRun, requestedCodes };
}

async function main() {
  const { dryRun, requestedCodes } = readArguments();

  console.log(
    dryRun
      ? "🔎 Vérification des nouvelles cartes (simulation, aucune écriture)…"
      : "🔎 Recherche de nouvelles cartes dans les chapitres existants…"
  );

  const [databaseSets, lorcastSetsJson] = await Promise.all([
    prisma.card.findMany({ select: { setCode: true }, distinct: ["setCode"] }),
    fetchJson<{ results?: LorcastSet[] }>(`${API_ROOT}/sets`),
  ]);

  const databaseCodes = new Set(
    databaseSets
      .map((row) => row.setCode)
      .filter((code): code is string => Boolean(code && /^\d+$/.test(code)))
  );

  const chapters = (lorcastSetsJson.results ?? [])
    .filter((set) => databaseCodes.has(set.code))
    .filter((set) => requestedCodes.size === 0 || requestedCodes.has(set.code))
    .sort((a, b) => Number(a.code) - Number(b.code));

  if (requestedCodes.size) {
    const unavailable = [...requestedCodes].filter(
      (code) => !chapters.some((chapter) => chapter.code === code)
    );
    if (unavailable.length) {
      console.warn(
        `⚠️ Chapitre(s) ignoré(s), absent(s) de la base ou de Lorcast : ${unavailable.join(", ")}`
      );
    }
  }

  if (!chapters.length) {
    console.log("✅ Aucun chapitre existant à vérifier");
    return;
  }

  console.log(`📚 Chapitres vérifiés : ${chapters.map((set) => set.code).join(", ")}`);

  let detected = 0;
  let inserted = 0;

  for (const chapter of chapters) {
    const cards = await fetchJson<LorcastCard[]>(
      `${API_ROOT}/sets/${chapter.code}/cards`
    );

    if (!Array.isArray(cards)) {
      throw new Error(`Réponse inattendue pour le chapitre ${chapter.code}`);
    }

    const existingCards = await prisma.card.findMany({
      where: { id: { in: cards.map((card) => card.id) } },
      select: { id: true },
    });
    const existingIds = new Set(existingCards.map((card) => card.id));
    const missingCards = cards.filter((card) => !existingIds.has(card.id));

    detected += missingCards.length;

    if (!missingCards.length) {
      console.log(`✅ Chapitre ${chapter.code} : aucune nouvelle carte (${cards.length} connues)`);
      continue;
    }

    console.log(
      `🆕 Chapitre ${chapter.code} : ${missingCards.length} nouvelle(s) carte(s) détectée(s)`
    );
    for (const card of missingCards) {
      console.log(`   • ${card.collector_number ?? "?"} — ${card.name} (${card.id})`);
    }

    if (dryRun) continue;

    const result = await prisma.card.createMany({
      data: missingCards.map((card) => ({
        id: card.id,
        name: card.name,
        setName: card.set?.name ?? chapter.name,
        setCode: card.set?.code ?? chapter.code,
        collection_number: card.collector_number ?? null,
        ink: card.ink ?? null,
        rarity: card.rarity ?? null,
        type: Array.isArray(card.type) ? card.type.join(", ") : null,
        text: card.text ?? null,
        imageUrl: card.image_uris?.digital?.normal ?? null,
        usd: numericPrice(card.prices?.usd),
        usd_foil: numericPrice(card.prices?.usd_foil),
      })),
      skipDuplicates: true,
    });

    inserted += result.count;
    console.log(`💾 Chapitre ${chapter.code} : ${result.count} carte(s) ajoutée(s)`);
  }

  if (dryRun) {
    console.log(
      `\n🧪 Simulation terminée : ${detected} nouvelle(s) carte(s) détectée(s), aucune écriture`
    );
  } else {
    console.log(
      `\n🎉 Vérification terminée : ${detected} détectée(s), ${inserted} ajoutée(s)`
    );
  }
}

main()
  .catch((error) => {
    console.error("❌ Erreur :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
