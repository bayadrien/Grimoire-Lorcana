import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type OpeningMetadata = {
  sessionId?: string;
  createSession?: boolean;
  title?: string;
  place?: { name?: string; kind?: string; url?: string } | null;
  provenanceType?: string;
  provenanceNote?: string;
  paidPrice?: number | string | null;
  priceScope?: string;
  comment?: string;
};

const clean = (value?: string | null) => value?.trim() || null;
const price = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

async function upsertPlace(tx: any, userId: string, metadata: OpeningMetadata) {
  const name = clean(metadata.place?.name);
  if (!name) return null;

  const kind = ["store", "online", "other"].includes(metadata.place?.kind || "") ? metadata.place?.kind! : "store";
  const url = clean(metadata.place?.url);
  const existing = await tx.openingPlace.findFirst({ where: { userId, name, kind } });

  if (existing) {
    return tx.openingPlace.update({
      where: { id: existing.id },
      data: { url, lastUsedAt: new Date(), useCount: { increment: 1 } },
    });
  }

  const lookupKey = `${kind}|${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;
  return tx.openingPlace.create({
    data: { userId, name, kind, url, lookupKey, useCount: 1 },
  });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const opening = await prisma.boosterOpening.findUnique({
      where: { id },
      include: {
        session: { include: { place: true } },
        place: true,
        cards: {
          include: {
            card: true,
          },
        },
      },
    });

    if (!opening) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ================== COLLECTION AVANT CE BOOSTER ==================
    const previousCards = await prisma.boosterCard.findMany({
      where: {
        opening: {
          userId: opening.userId,
          createdAt: {
            lt: opening.createdAt, // 🔥 uniquement les boosters AVANT
          },
        },
      },
      select: {
        cardId: true,
      },
    });

    // 🧠 On compte combien le joueur avait de chaque carte AVANT
    const collectionMap: Record<string, number> = {};

    previousCards.forEach((c) => {
      collectionMap[c.cardId] = (collectionMap[c.cardId] || 0) + 1;
    });

    // ================== ENRICH CARDS ==================
    const enrichedCards = opening.cards.map((c) => {
      const qtyBefore = collectionMap[c.cardId] || 0;

      return {
        ...c,
        alreadyOwned: qtyBefore > 0,   // AVANT ouverture
        quantityOwned: qtyBefore,      // combien il en avait
        isPlaysetFull: qtyBefore >= 4, // playset complet
      };
    });

    // ================== RETURN ==================
    return NextResponse.json({
      ...opening,
      cards: enrichedCards,
    });

  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Modifie uniquement les informations de provenance d'un booster. Les tirages
// et la collection ne sont volontairement jamais touchés ici.
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const userId = body?.userId === "angele" ? "angele" : body?.userId === "adrien" ? "adrien" : null;
    const metadata = (body?.metadata || {}) as OpeningMetadata;

    if (!userId) {
      return NextResponse.json({ error: "Profil invalide" }, { status: 400 });
    }

    const opening = await prisma.boosterOpening.findFirst({ where: { id, userId } });
    if (!opening) {
      return NextResponse.json({ error: "Booster introuvable" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (metadata.sessionId) {
        const session = await tx.openingSession.findFirst({
          where: { id: metadata.sessionId, userId },
        });
        if (!session) throw new Error("SESSION_NOT_FOUND");

        await tx.openingSession.update({
          where: { id: session.id },
          data: { updatedAt: new Date() },
        });
        await tx.boosterOpening.update({
          where: { id },
          data: {
            sessionId: session.id,
            placeId: null,
            provenanceType: null,
            provenanceNote: null,
            paidPrice: null,
            priceScope: null,
            comment: null,
          },
        });
        return;
      }

      const place = await upsertPlace(tx, userId, metadata);
      if (metadata.createSession) {
        const session = await tx.openingSession.create({
          data: {
            userId,
            title: clean(metadata.title) || `${clean(metadata.provenanceType) || "Booster"} · Chapitre ${opening.chapter}`,
            placeId: place?.id || null,
            provenanceType: clean(metadata.provenanceType),
            provenanceNote: clean(metadata.provenanceNote),
            paidPrice: price(metadata.paidPrice),
            priceScope: clean(metadata.priceScope) || "session",
            comment: clean(metadata.comment),
          },
        });
        await tx.boosterOpening.update({
          where: { id },
          data: {
            sessionId: session.id,
            placeId: null,
            provenanceType: null,
            provenanceNote: null,
            paidPrice: null,
            priceScope: null,
            comment: null,
          },
        });
        return;
      }

      await tx.boosterOpening.update({
        where: { id },
        data: {
          sessionId: null,
          placeId: place?.id || null,
          provenanceType: clean(metadata.provenanceType),
          provenanceNote: clean(metadata.provenanceNote),
          paidPrice: price(metadata.paidPrice),
          priceScope: clean(metadata.priceScope) || "booster",
          comment: clean(metadata.comment),
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("OPENING_METADATA_PATCH_ERROR:", error);
    const message = error instanceof Error && error.message === "SESSION_NOT_FOUND"
      ? "Cette session est introuvable."
      : "Impossible de modifier ce booster.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
