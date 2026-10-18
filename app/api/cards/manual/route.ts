import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validPinSession } from "@/lib/pin-session";
import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";

const MANUAL_PREFIX = "manual_";

type ManualCardInput = {
  id?: unknown;
  name?: unknown;
  name_fr?: unknown;
  setCode?: unknown;
  collection_number?: unknown;
  imageUrl?: unknown;
  ink?: unknown;
  rarity?: unknown;
  type?: unknown;
  text?: unknown;
  usd?: unknown;
  usd_foil?: unknown;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function cleanPrice(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : Number.NaN;
}

function isManualCard(id: string) {
  return id.startsWith(MANUAL_PREFIX);
}

async function hasPrivateSession(req: NextRequest) {
  return validPinSession(req.cookies.get("pin_session")?.value);
}

async function validateInput(body: ManualCardInput, currentId?: string) {
  const name = cleanText(body.name);
  const nameFr = cleanText(body.name_fr);
  const setCode = cleanText(body.setCode);
  const collectionNumber = cleanText(body.collection_number);
  const imageUrl = cleanText(body.imageUrl);
  const normalPrice = cleanPrice(body.usd);
  const foilPrice = cleanPrice(body.usd_foil);

  if (!name) return { error: "Le nom anglais est obligatoire." } as const;
  if (!setCode || !/^\d{1,2}$/.test(setCode)) {
    return { error: "Choisis un chapitre valide." } as const;
  }
  if (!collectionNumber) {
    return { error: "Le numéro de collection est obligatoire (ex. 13/P4)." } as const;
  }
  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      return { error: "L’adresse de l’image doit commencer par http:// ou https://." } as const;
    }
  }
  if (Number.isNaN(normalPrice) || Number.isNaN(foilPrice)) {
    return { error: "Les prix doivent être des nombres positifs." } as const;
  }

  const duplicate = await prisma.card.findFirst({
    where: {
      setCode,
      collection_number: { equals: collectionNumber, mode: "insensitive" },
      ...(currentId ? { id: { not: currentId } } : {}),
    },
    select: { id: true, name: true, name_fr: true },
  });

  if (duplicate) {
    return {
      error: `Le numéro ${collectionNumber} existe déjà dans ce chapitre (${duplicate.name_fr || duplicate.name || duplicate.id}).`,
    } as const;
  }

  return {
    data: {
      name,
      name_fr: nameFr,
      setCode,
      setName: CHAPTERS_NAMES_FR[setCode] || `Chapitre ${setCode}`,
      collection_number: collectionNumber,
      imageUrl,
      ink: cleanText(body.ink),
      rarity: cleanText(body.rarity) || "Promo",
      type: cleanText(body.type),
      text: cleanText(body.text),
      usd: normalPrice,
      usd_foil: foilPrice,
    },
  } as const;
}

export async function GET(req: NextRequest) {
  if (!(await hasPrivateSession(req))) {
    return NextResponse.json({ error: "Accès privé requis." }, { status: 401 });
  }

  try {
    const cards = await prisma.card.findMany({
      where: {
        OR: [
          { id: { startsWith: MANUAL_PREFIX } },
          { rarity: { equals: "Promo", mode: "insensitive" } },
        ],
      },
      orderBy: [{ setCode: "desc" }, { collection_number: "asc" }],
      select: {
        id: true,
        name: true,
        name_fr: true,
        setCode: true,
        setName: true,
        collection_number: true,
        imageUrl: true,
        ink: true,
        rarity: true,
        type: true,
        text: true,
        usd: true,
        usd_foil: true,
      },
    });

    return NextResponse.json({
      cards: cards.map((card) => ({ ...card, editable: isManualCard(card.id) })),
    });
  } catch (error) {
    console.error("MANUAL CARDS GET ERROR:", error);
    return NextResponse.json({ error: "Impossible de charger les cartes promotionnelles." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasPrivateSession(req))) {
    return NextResponse.json({ error: "Accès privé requis." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ManualCardInput;
    const validated = await validateInput(body);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const card = await prisma.card.create({
      data: {
        id: `${MANUAL_PREFIX}${crypto.randomUUID()}`,
        ...validated.data,
      },
    });

    return NextResponse.json({ card: { ...card, editable: true } }, { status: 201 });
  } catch (error) {
    console.error("MANUAL CARDS CREATE ERROR:", error);
    return NextResponse.json({ error: "Impossible d’ajouter la carte." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await hasPrivateSession(req))) {
    return NextResponse.json({ error: "Accès privé requis." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ManualCardInput;
    const id = cleanText(body.id);
    if (!id || !isManualCard(id)) {
      return NextResponse.json({ error: "Seules les cartes ajoutées sur cette page peuvent être modifiées." }, { status: 403 });
    }

    const existing = await prisma.card.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });

    const validated = await validateInput(body, id);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const card = await prisma.card.update({ where: { id }, data: validated.data });
    return NextResponse.json({ card: { ...card, editable: true } });
  } catch (error) {
    console.error("MANUAL CARDS UPDATE ERROR:", error);
    return NextResponse.json({ error: "Impossible de modifier la carte." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await hasPrivateSession(req))) {
    return NextResponse.json({ error: "Accès privé requis." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ManualCardInput;
    const id = cleanText(body.id);
    if (!id || !isManualCard(id)) {
      return NextResponse.json({ error: "Seules les cartes ajoutées sur cette page peuvent être supprimées." }, { status: 403 });
    }

    const card = await prisma.card.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            collections: true,
            trades: true,
            boosterCards: true,
            deckCards: true,
            priceHistory: true,
          },
        },
      },
    });

    if (!card) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
    const usageCount = Object.values(card._count).reduce((total, count) => total + count, 0);
    if (usageCount > 0) {
      return NextResponse.json(
        { error: "Cette carte est déjà utilisée dans une collection, un deck ou un historique. Retire-la d’abord de ces éléments." },
        { status: 409 },
      );
    }

    await prisma.card.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("MANUAL CARDS DELETE ERROR:", error);
    return NextResponse.json({ error: "Impossible de supprimer la carte." }, { status: 500 });
  }
}
