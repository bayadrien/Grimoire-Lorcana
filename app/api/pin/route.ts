import { NextResponse } from "next/server";
import { createPinSession } from "@/lib/pin-session";

export async function POST(req: Request) {
  const { pin } = await req.json();
  const expected = process.env.PIN_CODE;

  if (!expected) {
    return NextResponse.json({ ok: false, error: "Le PIN privé n’est pas configuré." }, { status: 503 });
  }

  if (String(pin) !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const session = await createPinSession();
  if (!session) return NextResponse.json({ ok: false, error: "La session privée n’est pas configurée." }, { status: 503 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "pin_session",
    value: session,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return res;
}
