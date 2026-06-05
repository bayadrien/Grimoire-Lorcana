import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type InkKey =
  | "Amber"
  | "Amethyst"
  | "Emerald"
  | "Ruby"
  | "Sapphire"
  | "Steel"
  | "Other";

const INKS: InkKey[] = [
  "Amber",
  "Amethyst",
  "Emerald",
  "Ruby",
  "Sapphire",
  "Steel",
  "Other",
];

function inkKey(
  v?: string | null
): InkKey {
  if (!v) return "Other";

  return INKS.includes(
    v as InkKey
  )
    ? (v as InkKey)
    : "Other";
}

function safeChapter(
  v?: string | number | null
) {
  if (!v) return "0";

  const s = String(v).trim();

  // récupère tous les chiffres
  const match = s.match(/\d+/);

  if (match) {
    return String(
      parseInt(match[0])
    );
  }

  // mapping Lorcana
  const upper = s.toUpperCase();

  const map: Record<
    string,
    string
  > = {
    TFC: "1",
    ROTF: "2",
    ITI: "3",
    URS: "4",
    SSK: "5",
    AZU: "6",
    ARC: "7",
    JAF: "8",
    FAB: "9",
    DPF: "10",
    GVR: "11",
    CIN: "12",
  };

  return map[upper] || "0";
}

function usdToEuro(
  value?: number | null
) {
  return Number(value || 0) * 0.92;
}

export async function GET() {
  // =========================
  // LOAD ALL PLAYABLE CARDS
  // =========================


  const cards =
  await prisma.card.findMany({
    select: {
      id: true,
      name: true,
      name_fr: true,
      imageUrl: true,
      setCode: true,
      ink: true,
      rarity: true,
      usd: true,
      usd_foil: true,
    },
  });

  console.log(cards.slice(0, 10));

  // =========================
  // LOAD COLLECTIONS
  // =========================

  const [
    adrienRows,
    angeleRows,
  ] = await Promise.all([
    prisma.collection.findMany({
      where: {
        userId: "adrien",
      },

      select: {
        cardId: true,
        quantity: true,
      },
    }),

    prisma.collection.findMany({
      where: {
        userId: "angele",
      },

      select: {
        cardId: true,
        quantity: true,
      },
    }),
  ]);

  const adrien = new Map<
    string,
    number
  >(
    adrienRows.map((r) => [
      r.cardId,
      r.quantity,
    ])
  );

  const angele = new Map<
    string,
    number
  >(
    angeleRows.map((r) => [
      r.cardId,
      r.quantity,
    ])
  );

  // =========================
  // GLOBALS
  // =========================

  const totalCards =
    cards.length;

  let aOwned = 0;
  let gOwned = 0;
  let duoOwned = 0;

  let aDoubles = 0;
  let gDoubles = 0;

  let adrienValue = 0;
  let angeleValue = 0;

  let adrienBestCard: any =
    null;

  let angeleBestCard: any =
    null;

  let legendaryCount = 0;
  let enchantedCount = 0;

  // =========================
  // GROUPS
  // =========================

  const byChapter: Record<
    string,
    any
  > = {};

  const byInk: Record<
    string,
    any
  > = {};

  function ensureChapter(
    ch: string
  ) {
    if (!byChapter[ch]) {
      byChapter[ch] = {
        chapter: ch,
        total: 0,
        adrienOwned: 0,
        angeleOwned: 0,
        duoOwned: 0,
      };
    }

    return byChapter[ch];
  }

  function ensureInk(
    ink: InkKey
  ) {
    if (!byInk[ink]) {
      byInk[ink] = {
        ink,
        total: 0,
        adrienOwned: 0,
        angeleOwned: 0,
        duoOwned: 0,
      };
    }

    return byInk[ink];
  }

  // =========================
  // LOOP
  // =========================

console.log(
  cards.slice(0, 20)
);

  for (const c of cards) {
    const ch = safeChapter(
      c.setCode
    );

    const ik = inkKey(c.ink);

    const aQty =
      adrien.get(c.id) ?? 0;

    const gQty =
      angele.get(c.id) ?? 0;

    const aHas = aQty > 0;
    const gHas = gQty > 0;
    const duoHas =
      aHas || gHas;

    // =========================
    // PROGRESSION
    // =========================

    if (aHas) aOwned += 1;

    if (gHas) gOwned += 1;

    if (duoHas)
      duoOwned += 1;

    // =========================
    // DOUBLES
    // =========================

    if (aQty > 1) {
      aDoubles += aQty - 1;
    }

    if (gQty > 1) {
      gDoubles += gQty - 1;
    }

    // =========================
    // VALUE
    // =========================

    const cardValue = Math.max(
      usdToEuro(c.usd),
      usdToEuro(c.usd_foil)
    );

    adrienValue +=
      cardValue * aQty;

    angeleValue +=
      cardValue * gQty;

    // =========================
    // BEST CARD
    // =========================

    if (
      aQty > 0 &&
      (!adrienBestCard ||
        cardValue >
          adrienBestCard.value)
    ) {
      adrienBestCard = {
        ...c,
        value: cardValue,
      };
    }

    if (
      gQty > 0 &&
      (!angeleBestCard ||
        cardValue >
          angeleBestCard.value)
    ) {
      angeleBestCard = {
        ...c,
        value: cardValue,
      };
    }

    // =========================
    // RARITIES
    // =========================

    if (
      c.rarity
        ?.toLowerCase()
        .includes(
          "legendary"
        )
    ) {
      legendaryCount++;
    }

    if (
      c.rarity
        ?.toLowerCase()
        .includes(
          "enchanted"
        )
    ) {
      enchantedCount++;
    }

    // =========================
    // CHAPTERS
    // =========================

    const CH =
      ensureChapter(ch);

    CH.total += 1;

    if (aHas)
      CH.adrienOwned += 1;

    if (gHas)
      CH.angeleOwned += 1;

    if (duoHas)
      CH.duoOwned += 1;

    // =========================
    // INKS
    // =========================

    const IK = ensureInk(ik);

    IK.total += 1;

    if (aHas)
      IK.adrienOwned += 1;

    if (gHas)
      IK.angeleOwned += 1;

    if (duoHas)
      IK.duoOwned += 1;
  }

  // =========================
  // SORTS
  // =========================

  const chapters =
    Object.values(byChapter)
      .filter(
        (x: any) =>
          x.chapter !== "0"
      )
      .sort(
        (a: any, b: any) =>
          Number(a.chapter) -
          Number(b.chapter)
      );

  const inks =
    Object.values(byInk);

  // =========================
  // RESPONSE
  // =========================

  return NextResponse.json({
    totalCards,

    global: {
      adrienOwned: aOwned,
      angeleOwned: gOwned,
      duoOwned,

      adrienMissing:
        totalCards - aOwned,

      angeleMissing:
        totalCards - gOwned,

      duoMissing:
        totalCards - duoOwned,

      adrienDoubles:
        aDoubles,

      angeleDoubles:
        gDoubles,

      legendaryCount,
      enchantedCount,

      adrienValue:
        Number(
          adrienValue.toFixed(2)
        ),

      angeleValue:
        Number(
          angeleValue.toFixed(2)
        ),

      totalValue: Number(
        (
          adrienValue +
          angeleValue
        ).toFixed(2)
      ),

      adrienBestCard,
      angeleBestCard,
    },

    chapters,
    inks,
  });
}