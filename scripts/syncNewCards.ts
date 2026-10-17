/*
  Recherche les cartes ajoutees tardivement dans les chapitres deja connus.

  Commandes :
    npm run sync:new-cards
    npm run sync:new-cards -- --dry-run
    npm run sync:new-cards -- 14
    npm run sync:new-cards -- 12 13 14 --dry-run

  Le script :
  - ajoute uniquement les identifiants Lorcast absents de Card_new ;
  - detecte les cartes existantes rattachees au mauvais chapitre ;
  - repare les anciennes cartes provisoires (nom Unknown ou metadonnees manquantes) ;
  - ne touche jamais aux noms francais, collections, decks, echanges ou historiques.
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

type ExistingCard = {
  id: string;
  name: string | null;
  setName: string | null;
  setCode: string | null;
  collection_number: string | null;
  ink: string | null;
  rarity: string | null;
  type: string | null;
  text: string | null;
  imageUrl: string | null;
  usd: number | null;
  usd_foil: number | null;
};

function numericPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBlank(value: string | null | undefined) {
  return !value || !value.trim();
}

function needsMetadataRepair(card: ExistingCard) {
  return (
    isBlank(card.name) ||
    card.name === "Unknown" ||
    isBlank(card.collection_number) ||
    isBlank(card.imageUrl) ||
    isBlank(card.rarity) ||
    isBlank(card.ink)
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`${url} a repondu ${response.status}`);
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

function sourceData(card: LorcastCard, chapter: LorcastSet) {
  return {
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
  };
}

function repairData(existing: ExistingCard, card: LorcastCard, chapter: LorcastSet) {
  const source = sourceData(card, chapter);
  const chapterStoredAsSetName = existing.setCode === null && existing.setName === chapter.code;

  return {
    name: isBlank(existing.name) || existing.name === "Unknown" ? source.name : existing.name,
    setName: chapterStoredAsSetName || isBlank(existing.setName) ? source.setName : existing.setName,
    setCode: chapterStoredAsSetName ? chapter.code : existing.setCode,
    collection_number: isBlank(existing.collection_number)
      ? source.collection_number
      : existing.collection_number,
    ink: isBlank(existing.ink) ? source.ink : existing.ink,
    rarity: isBlank(existing.rarity) ? source.rarity : existing.rarity,
    type: isBlank(existing.type) ? source.type : existing.type,
    text: isBlank(existing.text) ? source.text : existing.text,
    imageUrl: isBlank(existing.imageUrl) ? source.imageUrl : existing.imageUrl,
    usd: existing.usd ?? source.usd,
    usd_foil: existing.usd_foil ?? source.usd_foil,
  };
}

async function main() {
  const { dryRun, requestedCodes } = readArguments();

  console.log(
    dryRun
      ? "Verification des nouvelles cartes (simulation, aucune ecriture)..."
      : "Recherche de nouvelles cartes dans les chapitres existants..."
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
        `Chapitre(s) ignore(s), absent(s) de la base ou de Lorcast : ${unavailable.join(", ")}`
      );
    }
  }

  if (!chapters.length) {
    console.log("Aucun chapitre existant a verifier");
    return;
  }

  console.log(`Chapitres verifies : ${chapters.map((set) => set.code).join(", ")}`);

  let detected = 0;
  let inserted = 0;
  let repairable = 0;
  let repaired = 0;
  let suspicious = 0;

  for (const chapter of chapters) {
    const cards = await fetchJson<LorcastCard[]>(`${API_ROOT}/sets/${chapter.code}/cards`);

    if (!Array.isArray(cards)) {
      throw new Error(`Reponse inattendue pour le chapitre ${chapter.code}`);
    }

    const existingCards = await prisma.card.findMany({
      where: { id: { in: cards.map((card) => card.id) } },
      select: {
        id: true,
        name: true,
        setName: true,
        setCode: true,
        collection_number: true,
        ink: true,
        rarity: true,
        type: true,
        text: true,
        imageUrl: true,
        usd: true,
        usd_foil: true,
      },
    });
    const existingById = new Map(existingCards.map((card) => [card.id, card]));
    const missingCards = cards.filter((card) => !existingById.has(card.id));
    const cardsToRepair = cards.filter((card) => {
      const existing = existingById.get(card.id);
      if (!existing) return false;
      const chapterStoredAsSetName = existing.setCode === null && existing.setName === chapter.code;
      return chapterStoredAsSetName || needsMetadataRepair(existing);
    });
    const wrongChapterCards = existingCards.filter(
      (card) => card.setCode !== null && card.setCode !== chapter.code
    );
    const correctlyAssigned = existingCards.filter((card) => card.setCode === chapter.code).length;

    detected += missingCards.length;
    repairable += cardsToRepair.length;
    suspicious += wrongChapterCards.length;

    console.log(
      `Chapitre ${chapter.code} : ${cards.length} chez Lorcast, ${correctlyAssigned} correctement rattachee(s), ` +
        `${missingCards.length} nouvelle(s), ${cardsToRepair.length} a completer/reparer`
    );

    for (const card of missingCards) {
      console.log(`   + ${card.collector_number ?? "?"} - ${card.name} (${card.id})`);
    }
    for (const card of wrongChapterCards) {
      console.warn(
        `   ! ${card.id} existe avec setCode=${card.setCode}; correction automatique ignoree`
      );
    }

    if (dryRun) continue;

    if (missingCards.length) {
      const result = await prisma.card.createMany({
        data: missingCards.map((card) => ({ id: card.id, ...sourceData(card, chapter) })),
        skipDuplicates: true,
      });
      inserted += result.count;
      console.log(`   ${result.count} nouvelle(s) carte(s) ajoutee(s)`);
    }

    for (const card of cardsToRepair) {
      const existing = existingById.get(card.id);
      if (!existing) continue;
      await prisma.card.update({
        where: { id: card.id },
        data: repairData(existing, card, chapter),
      });
      repaired += 1;
    }

    if (cardsToRepair.length) {
      console.log(`   ${cardsToRepair.length} carte(s) completee(s) ou reparee(s)`);
    }
  }

  if (dryRun) {
    console.log(
      `\nSimulation terminee : ${detected} nouvelle(s), ${repairable} a reparer, ` +
        `${suspicious} rattachement(s) suspect(s), aucune ecriture`
    );
  } else {
    console.log(
      `\nVerification terminee : ${detected} nouvelle(s) detectee(s), ${inserted} ajoutee(s), ` +
        `${repaired} completee(s)/reparee(s), ${suspicious} rattachement(s) suspect(s)`
    );
  }
}

main()
  .catch((error) => {
    console.error("Erreur :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

