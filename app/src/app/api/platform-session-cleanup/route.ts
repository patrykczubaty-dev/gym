import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { deletePlatformSession } from "@/lib/session";

// Siehe api/session-cleanup/route.ts fuer die Begruendung (Cookies duerfen
// nicht waehrend des Renderns einer Server Component geloescht werden).
export async function GET(request: NextRequest) {
  await deletePlatformSession();
  return NextResponse.redirect(new URL("/platform/login", request.url));
}
