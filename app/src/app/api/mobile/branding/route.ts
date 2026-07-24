import { NextRequest, NextResponse } from "next/server";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { resolveGymBranding } from "@/lib/branding";

// Getrennt von verify-otp's Branding-Feld, damit die App das Branding auch
// nach einem Neustart (Token aus SecureStore, kein neuer Login) aktualisieren
// kann, z.B. falls das Studio zwischenzeitlich die Farbe geaendert hat.
export async function GET(request: NextRequest) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const gym = await prisma.gym.findUnique({
    where: { id: customer.gymId },
    select: {
      name: true,
      logoUrl: true,
      logoOnDarkUrl: true,
      logoOnLightUrl: true,
      faviconUrl: true,
      loginClaim: true,
      primaryColor: true,
      accentColor: true,
    },
  });
  const branding = resolveGymBranding(gym);

  return NextResponse.json({
    studioName: branding.studioName,
    primaryColor: branding.primaryColor,
    // Die App ist ausschliesslich dunkel gestaltet (siehe mobile/lib/theme.ts)
    // - bevorzugt deshalb die fuer dunkle Hintergruende gedachte Logo-
    // Variante, faellt aber auf das Standard-Logo zurueck, falls das Studio
    // keine separate Dark-Variante hochgeladen hat.
    logoUrl: branding.logoOnDarkUrl ?? branding.logoUrl,
  });
}
