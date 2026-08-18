import { NextRequest, NextResponse } from "next/server";
import { validPinSession } from "@/lib/pin-session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/pin" || pathname === "/api/pin") return NextResponse.next();
  if (await validPinSession(req.cookies.get("pin_session")?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Accès privé requis." }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/pin";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|grimoire-icon.png|manifest.webmanifest|sw.js).*)"],
};
