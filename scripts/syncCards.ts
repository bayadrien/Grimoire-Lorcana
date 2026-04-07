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
  cost?: number | null;
  strength?: number | null;
  willpower?: number | null;
  lore?: number | null;
  rarity?: string | null;
  ink?: string | null;
  type?: string[] | null;
  set?: { code: string; name: string } | null;
  image_uris?: { digital?: { normal?: string } } | null;
};

async function main() {
  console.log("🔎 Récupération des sets…");

  const setsRes = await fetch("https://api.lorcast.com/v0/sets");
  const setsJson = await setsRes.json();

  const sets: LorcastSet[] = setsJson.results || [];

  const chapterSets = sets
    .filter((s) => /^\d+$/.test(s.code))
    .sort((a, b) => Number(a.code) - Number(b.code));

  console.log(`📦 Sets: ${chapterSets.map((s) => s.code).join(", ")}`);

  let total = 0;

  for (const s of chapterSets) {
    console.log(`\n📚 Import set ${s.code}`);

    await sleep(200);

    const res = await fetch(`https://api.lorcast.com/v0/sets/${s.code}/cards`);
    const cards: LorcastCard[] = await res.json();

    let count = 0;

for (const c of cards) {
  const name = c.name.replace(/'/g, "''"); // éviter erreurs SQL

  const typeStr = Array.isArray(c.type) ? c.type.join(", ") : null;

  await prisma.$executeRawUnsafe(`
    INSERT INTO "Card" (
      id, name, "setName", "setCode", ink, rarity, type,
      cost, strength, willpower, lore, text, "imageUrl"
    )
    VALUES (
      '${c.id}',
      '${name}',
      '${c.set?.name ?? s.name}',
      '${c.set?.code ?? s.code}',
      ${c.ink ? `'${c.ink}'` : "NULL"},
      ${c.rarity ? `'${c.rarity}'` : "NULL"},
      ${typeStr ? `'${typeStr}'` : "NULL"},
      ${c.cost ?? "NULL"},
      ${c.strength ?? "NULL"},
      ${c.willpower ?? "NULL"},
      ${c.lore ?? "NULL"},
      ${c.text ? `'${c.text.replace(/'/g, "''")}'` : "NULL"},
      ${c.image_uris?.digital?.normal ? `'${c.image_uris.digital.normal}'` : "NULL"}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      "setName" = EXCLUDED."setName",
      "setCode" = EXCLUDED."setCode",
      ink = EXCLUDED.ink,
      rarity = EXCLUDED.rarity,
      type = EXCLUDED.type,
      cost = EXCLUDED.cost,
      strength = EXCLUDED.strength,
      willpower = EXCLUDED.willpower,
      lore = EXCLUDED.lore,
      text = EXCLUDED.text,
      "imageUrl" = EXCLUDED."imageUrl";
  `);

  await sleep(10);
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