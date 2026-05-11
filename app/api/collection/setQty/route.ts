import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const {
      userId,
      cardId,
      variant,
      quantity,
      // 👤 Passe la carte en mode anglais
      isEnglish = false,
    } = await req.json();

    // 🔒 Validation
    if (
      !userId ||
      !cardId ||
      (variant !== "normal" && variant !== "foil") ||
      typeof quantity !== "number"
    ) {
      return NextResponse.json(
        { ok: false, error: "Bad payload" },
        { status: 400 }
      );
    }

    // 👤 Crée l'utilisateur si besoin
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        name: userId,
      },
    });

    const q = Math.max(0, quantity);

    const cardExists = await prisma.card.findUnique({
      where: {
        id: cardId,
      },
    });

    console.log("CARD EXISTS =", cardExists);

    // 🔍 Cherche une ligne existante
    console.log("SET QTY =", {
      userId,
      cardId,
      variant,
      isEnglish,
    });

    const existing = await prisma.collection.findFirst({
      where: {
        userId,
        cardId,
        variant,
        isEnglish,
      },
    });

    // ✏️ Mise à jour
    if (existing) {
      await prisma.collection.updateMany({
        where: {
          userId,
          cardId,
          variant,
          isEnglish,
        },
        data: {
          quantity: q,
        },
      });
    }

    // ➕ Création
    else {
      await prisma.collection.create({
        data: {
          userId,
          cardId,
          variant,
          quantity: q,
          isEnglish,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      cardId,
      variant,
      quantity: q,
      isEnglish,
    });
  } catch (e) {
    console.error("SET QTY ERROR =", e);

    return NextResponse.json(
      {
        ok: false,
        error: "Server error",
      },
      {
        status: 500,
      }
    );
  }
}