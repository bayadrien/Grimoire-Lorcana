import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type LorcastSet = {
  id: string;
  name: string;
  code: string;
};

type LorcastCard = {
  id: string;
  name: string;
  text?: string | null;
  rarity?: string | null;
  ink?: string | null;
  type?: string[] | null;
  set?: { code: string; name: string } | null;
  image_uris?: { digital?: { normal?: string } } | null;
};

async function getExistingSetCodes() {
  const sets = await prisma.card.findMany({
    select: { setCode: true },
    distinct: ["setCode"],
  });

  return sets.map((s) => s.setCode);
}

async function main() {
  console.log("🔎 Récupération des sets…");

  const setsRes = await fetch("https://api.lorcast.com/v0/sets");
  const setsJson = await setsRes.json();

  const sets: LorcastSet[] = setsJson.results || [];

  const chapterSets = sets
    .filter((s) => /^\d+$/.test(s.code))
    .sort((a, b) => Number(a.code) - Number(b.code));

  console.log(`📦 Sets: ${chapterSets.map((s) => s.code).join(", ")}`);

  const existingSetCodes = await getExistingSetCodes();

  const newSets = chapterSets.filter(
    (s) => !existingSetCodes.includes(s.code)
  );

  if (newSets.length === 0) {
    console.log("✅ Aucun nouveau chapitre à importer");
    return;
  }

  console.log(
    "🚨 Nouveaux chapitres détectés :",
    newSets.map((s) => s.code)
  );

  let total = 0;

  for (const s of newSets) {
    console.log(`\n📚 Import set ${s.code}`);

    await sleep(200);

    const res = await fetch(
      `https://api.lorcast.com/v0/sets/${s.code}/cards`
    );
    const cards: LorcastCard[] = await res.json();

    for (const c of cards) {
      const typeStr = Array.isArray(c.type) ? c.type.join(", ") : null;

      await prisma.card.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          setName: c.set?.name ?? s.name,
          setCode: c.set?.code ?? s.code,
          ink: c.ink ?? null,
          rarity: c.rarity ?? null,
          type: typeStr,
          text: c.text ?? null,
          imageUrl: c.image_uris?.digital?.normal ?? null,
        },
        create: {
          id: c.id,
          name: c.name,
          setName: c.set?.name ?? s.name,
          setCode: c.set?.code ?? s.code,
          ink: c.ink ?? null,
          rarity: c.rarity ?? null,
          type: typeStr,
          text: c.text ?? null,
          imageUrl: c.image_uris?.digital?.normal ?? null,
        },
      });

      total++;
    }

    console.log(`✅ Set ${s.code} terminé (${cards.length} cartes)`);
  }

  console.log(`\n🎉 Sync terminé : ${total} cartes`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });