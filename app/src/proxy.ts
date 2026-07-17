import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionPayload, getPlatformSessionPayload } from "@/lib/session";
import { directPrisma } from "@/lib/prisma-direct";

// Proxy validiert hier bewusst nicht nur "ist ein Cookie vorhanden", sondern
// "zeigt das Cookie noch auf einen echten Datensatz" (Gueltigkeits- statt
// Existenzpruefung). Ohne das entsteht bei einem veralteten/ungueltigen
// Cookie eine Redirect-Schleife zwischen /login und /dashboard
// (ERR_TOO_MANY_REDIRECTS) - u.a. beobachtet nach einem DB-Reset, bei dem
// alte Session-Cookies auf nicht mehr existierende IDs zeigen. Ab Next.js 16
// laeuft Proxy standardmaessig im Node.js-Runtime, ein DB-Check hier ist also
// unproblematisch. Die eigentliche Autorisierung (Berechtigungen je Modul)
// bleibt weiterhin Sache der DAL/Server Actions, nicht dieser Datei.
//
// Zwei getrennte Auth-Bereiche: /platform/* (Plattform-Admin, eigenes
// Cookie) und alles andere (Gym-Mitarbeiter). Ein Mitarbeiter-Cookie
// gewaehrt niemals Zugriff auf /platform/* und umgekehrt.

const PUBLIC_ROUTES = ["/login", "/forgot-password"];
// /api/mobile/* wird weiter unten bereits vollstaendig separat behandelt
// (eigener CORS-/Bearer-Token-Pfad, siehe MOBILE_API_PREFIX) und taucht
// deshalb hier bewusst nicht auf.
const PUBLIC_PREFIXES = ["/api/trial-response", "/reset-password"];

const PLATFORM_PUBLIC_ROUTES = ["/platform/login", "/platform/forgot-password"];
const PLATFORM_PUBLIC_PREFIXES = ["/platform/reset-password"];

const EMPLOYEE_COOKIE = "session";
const PLATFORM_COOKIE = "platform_session";

function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function isPlatformPublicRoute(pathname: string): boolean {
  return (
    PLATFORM_PUBLIC_ROUTES.includes(pathname) ||
    PLATFORM_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

async function employeeSessionIsValid(employeeId: string, gymId: string): Promise<boolean> {
  try {
    const count = await directPrisma.employee.count({ where: { id: employeeId, gymId } });
    return count > 0;
  } catch {
    // DB kurzzeitig nicht erreichbar: nicht faelschlich ausloggen, sondern
    // wie bisher optimistisch behandeln - die DAL faengt einen wirklich
    // ungueltigen Fall ohnehin als zweite Ebene ab.
    return true;
  }
}

async function platformSessionIsValid(platformAdminId: string): Promise<boolean> {
  try {
    const count = await directPrisma.platformAdmin.count({ where: { id: platformAdminId } });
    return count > 0;
  } catch {
    return true;
  }
}

// /api/mobile/*: von der nativen App (und im Web-Build, siehe mobile/lib/
// storage.ts) aus einem fremden Origin aufgerufen, nicht vom eigenen
// Next.js-Frontend. Wildcard-Origin ist hier unproblematisch, da diese
// Routen sich per Bearer-Token authentifizieren (kein Cookie, also keine
// CSRF-Angriffsflaeche durch automatisches Mitschicken von Zugangsdaten).
const MOBILE_API_PREFIX = "/api/mobile";
const MOBILE_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(MOBILE_API_PREFIX)) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: MOBILE_CORS_HEADERS });
    }
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(MOBILE_CORS_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  }

  if (pathname.startsWith("/platform")) {
    const platformSession = await getPlatformSessionPayload();
    const isPlatformAuthenticated =
      Boolean(platformSession?.platformAdminId) &&
      (await platformSessionIsValid(platformSession!.platformAdminId));

    if (platformSession?.platformAdminId && !isPlatformAuthenticated) {
      const response = NextResponse.redirect(new URL("/platform/login", request.url));
      response.cookies.delete(PLATFORM_COOKIE);
      return response;
    }

    if (!isPlatformPublicRoute(pathname) && !isPlatformAuthenticated) {
      return NextResponse.redirect(new URL("/platform/login", request.url));
    }
    if (pathname === "/platform/login" && isPlatformAuthenticated) {
      return NextResponse.redirect(new URL("/platform", request.url));
    }
    return NextResponse.next();
  }

  const session = await getSessionPayload();
  const isAuthenticated =
    Boolean(session?.employeeId && session.gymId) &&
    (await employeeSessionIsValid(session!.employeeId, session!.gymId));

  if (session?.employeeId && !isAuthenticated) {
    // Cookie war vorhanden, zeigt aber auf keinen echten Mitarbeiter (mehr) -
    // direkt loeschen und in einem einzigen Sprung auf /login, statt ueber
    // /dashboard -> /api/session-cleanup -> /login zu springen.
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(EMPLOYEE_COOKIE);
    return response;
  }

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
