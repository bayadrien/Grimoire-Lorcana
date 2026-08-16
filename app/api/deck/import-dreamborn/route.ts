import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type ImportedEntry = { name: string; quantity: number; code?: string };

const normalize = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function parseDreambornCode(html: string): ImportedEntry[] {
  const candidates = [...html.matchAll(/"([A-Za-z0-9+/=]{40,})"/g)]
    .map((match) => match[1])
    .map((value) => {
      try {
        return Buffer.from(value, "base64").toString("utf8");
      } catch {
        return "";
      }
    });
  const code = candidates.find((value) => value.includes("$") && value.includes("|"));
  if (!code) return [];
  const entries = code
    .split("|")
    .map((entry) => {
      const [rawName, rawQuantity] = entry.split("$");
      return { name: rawName.replace(/_/g, " ").trim(), quantity: Number(rawQuantity) };
    })
    .filter((entry) => entry.name && Number.isFinite(entry.quantity) && entry.quantity > 0);

  const nuxtScript = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1].trim())
    .find((script) => script.startsWith("[[") && script.includes('"cards"'));

  try {
    const payload = nuxtScript ? JSON.parse(nuxtScript) : [];
    const deck = payload.find(
      (item: unknown) =>
        item &&
        typeof item === "object" &&
        "cards" in item &&
        typeof (item as { cards?: unknown }).cards === "number"
    ) as { cards: number } | undefined;
    const cards = deck ? payload[deck.cards] : null;
    const codes = cards && typeof cards === "object" ? Object.keys(cards) : [];
    return entries.map((entry, index) => ({ ...entry, code: codes[index] }));
  } catch {
    return entries;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body.userId === "angele" ? "angele" : "adrien";
    const url = new URL(String(body.url || "").trim());
    if (url.hostname !== "dreamborn.ink" && !url.hostname.endsWith(".dreamborn.ink")) {
      return NextResponse.json({ error: "Le lien doit venir de Dreamborn.ink." }, { status: 400 });
    }
    if (!/\/decks\/[A-Za-z0-9]+/.test(url.pathname)) {
      return NextResponse.json({ error: "Ce lien Dreamborn ne correspond pas à un deck public." }, { status: 400 });
    }
    let html = typeof body.html === "string" ? body.html : "";
    if (!html) {
      const response = await fetch(url.toString(), {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Grimoire-Lorcana)" },
        cache: "no-store",
      });
      if (!response.ok) return NextResponse.json({ error: "Dreamborn n’a pas retourné ce deck." }, { status: 422 });
      html = await response.text();
    }
    if (html.length > 2_000_000) return NextResponse.json({ error: "La page Dreamborn est trop volumineuse." }, { status: 422 });
    const entries = parseDreambornCode(html);
    if (!entries.length) return NextResponse.json({ error: "Impossible de lire la liste de cartes de ce deck Dreamborn." }, { status: 422 });

    const allCards = await prisma.card.findMany({ select: { id: true, name: true, name_fr: true, ink: true, setCode: true, collection_number: true } });
    const cardByName = new Map<string, (typeof allCards)[number]>();
    allCards.forEach((card) => {
      cardByName.set(normalize(card.name), card);
      cardByName.set(normalize(card.name_fr), card);
    });
    const matched: Array<{ cardId: string; quantity: number; ink: string | null }> = [];
    const unmatched: string[] = [];
    entries.forEach((entry) => {
      const standardCode = entry.code?.match(/^0*(\d+)-0*(\d+)$/);
      const chapter = entry.code?.match(/^0*(\d+)/)?.[1];
      const card =
        (standardCode
          ? allCards.find(
              (candidate) =>
                String(Number(candidate.setCode)) === String(Number(standardCode[1])) &&
                Number(candidate.collection_number?.split("/")[0]) === Number(standardCode[2])
            )
          : undefined) ||
        cardByName.get(normalize(entry.name)) ||
        allCards.filter((candidate) => {
          const candidateName = normalize(candidate.name);
          return (
            (!chapter || String(Number(candidate.setCode)) === String(Number(chapter))) &&
            candidateName.length > 2 &&
            normalize(entry.name).includes(candidateName)
          );
        })[0];
      if (!card) unmatched.push(entry.name);
      else matched.push({ cardId: card.id, quantity: entry.quantity, ink: card.ink });
    });
    if (!matched.length) return NextResponse.json({ error: "Aucune carte de ce deck n’a pu être reconnue dans le Grimoire.", unmatched }, { status: 422 });

    const mergedCards = [...matched.reduce((cards, card) => {
      const existing = cards.get(card.cardId);
      cards.set(card.cardId, existing ? { ...existing, quantity: existing.quantity + card.quantity } : card);
      return cards;
    }, new Map<string, (typeof matched)[number]>()).values()];
    const title = html.match(/<title>([^<|]+?)(?:\s*\||<\/title>)/i)?.[1]?.trim() || "Deck Dreamborn";
    const inks = [...new Set(mergedCards.map((card) => card.ink).filter((ink): ink is string => Boolean(ink)))].slice(0, 2);
    const deck = await prisma.deck.create({
      data: {
        name: title,
        description: "Importé depuis Dreamborn.ink",
        inks,
        userId,
        cards: { create: mergedCards.map((card) => ({ cardId: card.cardId, quantity: card.quantity })) },
      },
      select: { id: true, name: true, inks: true },
    });
    return NextResponse.json({ deck, imported: mergedCards.length, totalCards: mergedCards.reduce((sum, card) => sum + card.quantity, 0), unmatched });
  } catch (error) {
    console.error("DREAMBORN IMPORT ERROR:", error);
    return NextResponse.json({ error: "Import Dreamborn impossible pour le moment." }, { status: 500 });
  }
}
