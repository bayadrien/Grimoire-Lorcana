import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type InkKey = "Amber" | "Amethyst" | "Emerald" | "Ruby" | "Sapphire" | "Steel" | "Other";
const INKS: InkKey[] = ["Amber", "Amethyst", "Emerald", "Ruby", "Sapphire", "Steel", "Other"];

function inkKey(v?: string | null): InkKey {
  if (!v) return "Other";
  return (INKS.includes(v as InkKey) ? (v as InkKey) : "Other");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const chapter = (url.searchParams.get("chapter") ?? "all").trim(); // "all" ou "1".."10"
  const ink = (url.searchParams.get("ink") ?? "all").trim(); // "all" ou Amber...

  const cards = await prisma.card.findMany({
    select: {
      id: true,
      name: true,
      setName: true,
      setCode: true,
      ink: true,
      rarity: true,
      cost: true,
      imageUrl: true,
    },
  });

  const [adrienRows, angeleRows] = await Promise.all([
    prisma.collection.findMany({ where: { userId: "adrien" }, select: { cardId: true, quantity: true } }),
    prisma.collection.findMany({ where: { userId: "angele" }, select: { cardId: true, quantity: true } }),
  ]);

  const adrien = new Map<string, number>(adrienRows.map(r => [r.cardId, r.quantity]));
  const angele = new Map<string, number>(angeleRows.map(r => [r.cardId, r.quantity]));

  // Filtrage cartes (pour recherche/filtres)
  const filtered = cards.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (chapter !== "all" && String(c.setCode ?? "") !== String(chapter)) return false;
    if (ink !== "all") {
      const ik = (c.ink ?? "");
      if (ik !== ink) return false;
    }
    return true;
  });

  // Adrien -> Angèle : Adrien a au moins 2, Angèle a 0
  const adrienToAngele = filtered
    .map((c) => {
      const a = adrien.get(c.id) ?? 0;
      const g = angele.get(c.id) ?? 0;
      const give = Math.max(0, a - 1); // copies “en trop” (au-delà de 1)
      const useful = give > 0 && g === 0;
      return useful ? { card: c, give, aQty: a, gQty: g } : null;
    })
    .filter(Boolean) as Array<any>;

  // Angèle -> Adrien : Angèle a au moins 2, Adrien a 0
  const angeleToAdrien = filtered
    .map((c) => {
      const a = adrien.get(c.id) ?? 0;
      const g = angele.get(c.id) ?? 0;
      const give = Math.max(0, g - 1);
      const useful = give > 0 && a === 0;
      return useful ? { card: c, give, aQty: a, gQty: g } : null;
    })
    .filter(Boolean) as Array<any>;

  // Tri agréable : chapitre puis nom
  const sortFn = (x: any, y: any) => {
    const cx = Number(x.card.setCode ?? 999);
    const cy = Number(y.card.setCode ?? 999);
    if (cx !== cy) return cx - cy;
    return String(x.card.name).localeCompare(String(y.card.name), "fr");
  };

  adrienToAngele.sort(sortFn);
  angeleToAdrien.sort(sortFn);

  // Stats de résumé
  const sumGive = (arr: Array<any>) => arr.reduce((acc, r) => acc + (r.give ?? 0), 0);

  return NextResponse.json({
    filters: {
      chapters: Array.from(new Set(cards.map(c => String(c.setCode ?? ""))))
        .filter(s => /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= 10)
        .sort((a, b) => Number(a) - Number(b)),
      inks: ["Amber", "Amethyst", "Emerald", "Ruby", "Sapphire", "Steel"],
    },
    adrienToAngele,
    angeleToAdrien,
    summary: {
      adrienToAngeleCount: adrienToAngele.length,
      angeleToAdrienCount: angeleToAdrien.length,
      adrienToAngeleCopies: sumGive(adrienToAngele),
      angeleToAdrienCopies: sumGive(angeleToAdrien),
    },
  });
}
