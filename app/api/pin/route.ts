import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { pin } = await req.json();
  const expected = process.env.PIN_CODE || "4827";

  if (String(pin) !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "pin_ok",
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: false, // en local. Sur Render on mettra true.
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return res;
}
