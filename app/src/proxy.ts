import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/session";

// Optimistischer Auth-Check (liest nur das Cookie, kein DB-Zugriff) -
// siehe Next.js-Doku "Optimistic checks with Proxy". Die eigentliche
// Autorisierung (Berechtigungen je Modul) erfolgt in der DAL/den Server
// Actions, nicht hier.

const PUBLIC_ROUTES = ["/login", "/forgot-password"];
const PUBLIC_PREFIXES = ["/api/trial-response", "/reset-password"];

function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionPayload();
  const isAuthenticated = Boolean(session?.employeeId);

  if (!isPublicRoute(pathname) && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Neben Next-internen Pfaden auch statische Assets im public/-Ordner
  // (z.B. Logo-PNGs) von der Auth-Prüfung ausnehmen - sonst schlägt u.a.
  // Next.js' interner Image-Optimizer-Fetch fehl, da er ohne Session-Cookie
  // läuft und sonst auf /login umgeleitet würde.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|avif)$).*)",
  ],
};
