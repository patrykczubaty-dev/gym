import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { deleteSession } from "@/lib/session";

// Route Handler statt direktem redirect() aus der DAL: Cookies dürfen laut
// Next.js nur in Server Actions/Route Handlern gelöscht werden, nicht während
// des Renderns einer Server Component (siehe lib/dal.ts).
export async function GET(request: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
