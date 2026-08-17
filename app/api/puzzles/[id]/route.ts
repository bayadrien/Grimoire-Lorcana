import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PUZZLES: Record<string, number> = { "ascension-floodborn": 4, "ascension-floodborn-2": 4, "retour-ursula": 9, "givresort": 9, "givresort-2": 9, "mer-azurite": 9, "archazia-1": 9, "archazia-2": 9, "jafar-1": 9, "jafar-2": 9, "fabuleux": 9, "contrees-inconnues": 9, "invasion-epineuse": 9 };

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = new URL(req.url).searchParams.get("userId") || "adrien";
  if (!PUZZLES[id]) return NextResponse.json({ error: "Puzzle introuvable" }, { status: 404 });

  const pieces = await prisma.puzzlePiece.findMany({
    where: { userId, puzzleId: id }, select: { piece: true, obtainedAt: true }, orderBy: { piece: "asc" },
  });
  return NextResponse.json({ pieces });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, piece, owned } = await req.json();
  if (!PUZZLES[id] || !["adrien", "angele"].includes(userId) || !Number.isInteger(piece) || piece < 1 || piece > PUZZLES[id] || typeof owned !== "boolean") {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  if (owned) {
    await prisma.puzzlePiece.upsert({
      where: { userId_puzzleId_piece: { userId, puzzleId: id, piece } },
      update: { obtainedAt: new Date() }, create: { userId, puzzleId: id, piece },
    });
  } else {
    await prisma.puzzlePiece.deleteMany({ where: { userId, puzzleId: id, piece } });
  }
  return NextResponse.json({ ok: true });
}
