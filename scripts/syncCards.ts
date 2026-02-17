import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type LorcastSet = {
  id: string;
  name: string;
  code: string; // "1", "2", ... "D100" etc
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
  if (!setsRes.ok) throw new Error(`Sets fetch failed: ${setsRes.status}`);
  const setsJson = await setsRes.json();

  const sets: LorcastSet[] = setsJson.results || [];
  const chapterSets = sets
    .filter((s) => /^\d+$/.test(s.code))
    .map((s) => ({ ...s, codeNum: Number(s.code) }))
    .filter((s) => s.codeNum >= 1)
    .sort((a, b) => a.codeNum - b.codeNum);

  console.log(`📦 Sets chapitres trouvés: ${chapterSets.map((s) => s.code).join(", ")}`);

  let totalUpserts = 0;

  for (const s of chapterSets) {
    console.log(`\n📚 Import set ${s.code} - ${s.name}`);

    // Respect du rate limit (50–100ms conseillé)
    await sleep(90);

    const url = `https://api.lorcast.com/v0/sets/${encodeURIComponent(s.code)}/cards`;
    const cardsRes = await fetch(url);
    if (!cardsRes.ok) throw new Error(`Cards fetch failed for set ${s.code}: ${cardsRes.status}`);

    const cards: LorcastCard[] = await cardsRes.json();

    // Upsert en base
    for (const c of cards) {
      const imageUrl = c.image_uris?.digital?.normal ?? null;
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
          cost: c.cost ?? null,
          strength: c.strength ?? null,
          willpower: c.willpower ?? null,
          lore: c.lore ?? null,
          text: c.text ?? null,
          imageUrl,
        },
        create: {
          id: c.id,
          name: c.name,
          setName: c.set?.name ?? s.name,
          setCode: c.set?.code ?? s.code,
          ink: c.ink ?? null,
          rarity: c.rarity ?? null,
          type: typeStr,
          cost: c.cost ?? null,
          strength: c.strength ?? null,
          willpower: c.willpower ?? null,
          lore: c.lore ?? null,
          text: c.text ?? null,
          imageUrl,
        },
      });

      totalUpserts++;
    }

    console.log(`✅ ${cards.length} cartes importées pour le set ${s.code}`);
  }

  console.log(`\n🎉 Terminé. Total upserts: ${totalUpserts}`);
}

main()
  .catch((e) => {
    console.error("❌ Sync failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
