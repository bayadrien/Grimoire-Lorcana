import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PUZZLES = new Set(["givresort", "mer-azurite", "archazia-1", "archazia-2", "jafar-1", "jafar-2", "fabuleux", "contrees-inconnues", "invasion-epineuse"]);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = new URL(req.url).searchParams.get("userId") || "adrien";
  if (!PUZZLES.has(id)) return NextResponse.json({ error: "Puzzle introuvable" }, { status: 404 });

  const pieces = await prisma.puzzlePiece.findMany({
    where: { userId, puzzleId: id }, select: { piece: true, obtainedAt: true }, orderBy: { piece: "asc" },
  });
  return NextResponse.json({ pieces });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, piece, owned } = await req.json();
  if (!PUZZLES.has(id) || !["adrien", "angele"].includes(userId) || !Number.isInteger(piece) || piece < 1 || piece > 9 || typeof owned !== "boolean") {
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
