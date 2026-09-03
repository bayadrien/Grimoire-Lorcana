import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type PlaceInput = { name?: unknown; city?: unknown; kind?: unknown };
type OpeningMetadata = { sessionId?: unknown; createSession?: unknown; title?: unknown; place?: PlaceInput | null; provenanceType?: unknown; provenanceNote?: unknown; paidPrice?: unknown; priceScope?: unknown; comment?: unknown };
const clean = (value: unknown, max = 180) => typeof value === "string" ? value.trim().slice(0, max) : "";
const priceFrom = (value: unknown) => { const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", ".")); return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null; };
const normalise = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function usePlace(tx: any, userId: string, input: PlaceInput | null | undefined) {
  const name = clean(input?.name);
  if (!name) return null;
  const city = clean(input?.city);
  const kind = ["store", "online", "event", "other"].includes(clean(input?.kind)) ? clean(input?.kind) : "store";
  const lookupKey = [kind, name, city].map(normalise).join("|");
  const place = await tx.openingPlace.upsert({
    where: { userId_lookupKey: { userId, lookupKey } },
    update: { name, city: city || null, kind, lastUsedAt: new Date(), useCount: { increment: 1 } },
    create: { userId, name, city: city || null, kind, lookupKey, useCount: 1, lastUsedAt: new Date() },
  });
  return place.id;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, chapter, boosterImage, cards } = body;
    const metadata = (body.metadata || {}) as OpeningMetadata;
    const hasMetadata = Boolean(body.metadata);
    const safeUserId = userId === "angele" ? "angele" : "adrien";
    if (!Array.isArray(cards) || !cards.length) return NextResponse.json({ error: "Aucune carte à enregistrer." }, { status: 400 });

    const totalValue = cards.reduce(
      (sum: number, c: any) => sum + (c.price || 0),
      0
    );

    const opening = await prisma.$transaction(async (tx) => {
      const provenanceType = clean(metadata.provenanceType, 50) || "Booster individuel";
      const provenanceNote = clean(metadata.provenanceNote);
      const comment = clean(metadata.comment, 600);
      const paidPrice = priceFrom(metadata.paidPrice);
      const priceScope = metadata.priceScope === "booster" ? "booster" : "product";
      let sessionId: string | null = null;
      let placeId: string | null = null;
      const requestedSession = clean(metadata.sessionId, 80);
      if (requestedSession) {
        const session = await tx.openingSession.findFirst({ where: { id: requestedSession, userId: safeUserId } });
        if (!session) throw new Error("Cette session n’existe pas ou n’appartient pas à ce profil.");
        sessionId = session.id;
        await tx.openingSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } });
      } else if (metadata.createSession) {
        placeId = await usePlace(tx, safeUserId, metadata.place);
        const session = await tx.openingSession.create({ data: { userId: safeUserId, title: clean(metadata.title) || null, placeId, provenanceType, provenanceNote: provenanceNote || null, paidPrice, priceScope, comment: comment || null } });
        sessionId = session.id;
      } else if (hasMetadata) {
        placeId = await usePlace(tx, safeUserId, metadata.place);
      }
      const created = await tx.boosterOpening.create({
        data: { userId: safeUserId, chapter: Number(chapter), boosterImage, totalValue: totalValue || 0, sessionId, placeId, provenanceType: hasMetadata && !sessionId ? provenanceType : null, provenanceNote: hasMetadata && !sessionId ? provenanceNote || null : null, paidPrice: hasMetadata && !sessionId ? paidPrice : null, priceScope: hasMetadata && !sessionId ? priceScope : null, comment: hasMetadata && !sessionId ? comment || null : null },
      });
      await tx.boosterCard.createMany({ data: cards.map((c: any) => ({ openingId: created.id, cardId: c.id, foil: c.foil || false })) });
      return created;
    });

    return NextResponse.json({ id: opening.id, sessionId: opening.sessionId });

  } catch (err) {
    console.error("❌ Booster save error:", err);

    return NextResponse.json(
      { error: "Erreur création booster" },
      { status: 500 }
    );
  }
}
