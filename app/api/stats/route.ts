import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type InkKey = "Amber" | "Amethyst" | "Emerald" | "Ruby" | "Sapphire" | "Steel" | "Other";
const INKS: InkKey[] = ["Amber", "Amethyst", "Emerald", "Ruby", "Sapphire", "Steel", "Other"];

function inkKey(v?: string | null): InkKey {
  if (!v) return "Other";
  return (INKS.includes(v as InkKey) ? (v as InkKey) : "Other");
}

function safeChapter(v?: string | null) {
  const s = String(v ?? "");
  return /^\d+$/.test(s) ? s : "0";
}

export async function GET() {
  // 1) load all cards once
  const cards = await prisma.card.findMany({
    select: { id: true, setCode: true, ink: true },
  });

  // 2) load both collections
  const [adrienRows, angeleRows] = await Promise.all([
    prisma.collection.findMany({ where: { userId: "adrien" }, select: { cardId: true, quantity: true } }),
    prisma.collection.findMany({ where: { userId: "angele" }, select: { cardId: true, quantity: true } }),
  ]);

  const adrien = new Map<string, number>(adrienRows.map(r => [r.cardId, r.quantity]));
  const angele = new Map<string, number>(angeleRows.map(r => [r.cardId, r.quantity]));

  const totalCards = cards.length;

  // global counters
  let aOwned = 0, gOwned = 0, duoOwned = 0;
  let aDoubles = 0, gDoubles = 0;

  // per chapter / ink
  const byChapter: Record<string, any> = {};
  const byInk: Record<string, any> = {};

  function ensureChapter(ch: string) {
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

  function ensureInk(ink: InkKey) {
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

  for (const c of cards) {
    const ch = safeChapter(c.setCode);
    const ik = inkKey(c.ink);

    const aQty = adrien.get(c.id) ?? 0;
    const gQty = angele.get(c.id) ?? 0;

    const aHas = aQty > 0;
    const gHas = gQty > 0;
    const duoHas = aHas || gHas;

    if (aHas) aOwned += 1;
    if (gHas) gOwned += 1;
    if (duoHas) duoOwned += 1;

    if (aQty > 1) aDoubles += (aQty - 1);
    if (gQty > 1) gDoubles += (gQty - 1);

    const CH = ensureChapter(ch);
    CH.total += 1;
    if (aHas) CH.adrienOwned += 1;
    if (gHas) CH.angeleOwned += 1;
    if (duoHas) CH.duoOwned += 1;

    const IK = ensureInk(ik);
    IK.total += 1;
    if (aHas) IK.adrienOwned += 1;
    if (gHas) IK.angeleOwned += 1;
    if (duoHas) IK.duoOwned += 1;
  }

  // format arrays sorted
  const chapters = Object.values(byChapter)
    .filter((x: any) => x.chapter !== "0")
    .sort((a: any, b: any) => Number(a.chapter) - Number(b.chapter));

  const inks = Object.values(byInk);

  return NextResponse.json({
    totalCards,
    global: {
      adrienOwned: aOwned,
      angeleOwned: gOwned,
      duoOwned,
      adrienMissing: totalCards - aOwned,
      angeleMissing: totalCards - gOwned,
      duoMissing: totalCards - duoOwned,
      adrienDoubles: aDoubles,
      angeleDoubles: gDoubles,
    },
    chapters,
    inks,
  });
}
