import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Autoriser la page PIN + assets Next
  if (
    pathname.startsWith("/pin") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Vérifie le cookie
  const ok = req.cookies.get("pin_ok")?.value === "1";
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/pin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"]
};
