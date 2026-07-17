import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withGymScope } from "@/lib/scoped-prisma";
import {
  getSessionPayload,
  getPlatformSessionPayload,
} from "@/lib/session";
import type { PermissionKey } from "@/lib/enums";

// Data Access Layer: zentraler Ort fuer Session-Verifikation, damit jede
// Seite/Server-Action/Route-Handler denselben Auth-Check verwendet.

export const verifySession = cache(async () => {
  const session = await getSessionPayload();
  if (!session?.employeeId || !session.gymId) {
    redirect("/login");
  }
  return { employeeId: session.employeeId, gymId: session.gymId };
});

export type CurrentEmployee = {
  id: string;
  gymId: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
} & Record<PermissionKey, boolean>;

// Nur die fuer die UI/Autorisierung noetigen Felder (kein passwordHash etc.)
// WICHTIG: Laeuft ueber withGymScope() (nicht den unscoped `prisma`-Import) -
// RLS ist FORCE-enabled, ohne gesetzte Session-Variable liefert Postgres hier
// sonst still gar keine Zeile zurueck, selbst bei korrektem WHERE-Filter
// (empirisch verifiziert, siehe scoped-prisma.ts). Die gymId kommt aus dem
// bereits verifizierten JWT (session.gymId), ist also vertrauenswuerdig genug,
// um den Scope damit zu oeffnen, bevor der Mitarbeiter selbst geladen ist.
export const getCurrentEmployee = cache(async (): Promise<CurrentEmployee> => {
  const session = await verifySession();

  const employee = await withGymScope(session.gymId, (db) =>
    db.employee.findUnique({
      where: { id: session.employeeId, gymId: session.gymId },
      select: {
        id: true,
        gymId: true,
        firstName: true,
        lastName: true,
        email: true,
        photoUrl: true,
        permAdmin: true,
        permCalendar: true,
        permTrials: true,
        permVouchers: true,
        permEmployees: true,
        permCustomers: true,
        permSepa: true,
        permEmailTemplates: true,
        permNews: true,
      },
    }),
  );

  if (!employee) {
    // Session-Cookie zeigt auf eine nicht mehr existierende Mitarbeiter-ID
    // oder ein nicht (mehr) zu ihrer gymId passendes Konto. Cookies duerfen
    // waehrend des Renderns einer Server Component nicht geloescht werden,
    // daher ueber einen Route Handler umleiten, der das Cookie entfernt -
    // sonst haelt proxy.ts den Nutzer faelschlich fuer eingeloggt und es
    // entsteht eine Redirect-Schleife zwischen /login und /dashboard.
    redirect("/api/session-cleanup");
  }

  return employee;
});

// --- Plattform-Admin -------------------------------------------------------

export const verifyPlatformSession = cache(async () => {
  const session = await getPlatformSessionPayload();
  if (!session?.platformAdminId) {
    redirect("/platform/login");
  }
  return { platformAdminId: session.platformAdminId };
});

export type CurrentPlatformAdmin = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export const getCurrentPlatformAdmin = cache(async (): Promise<CurrentPlatformAdmin> => {
  const session = await verifyPlatformSession();

  const admin = await prisma.platformAdmin.findUnique({
    where: { id: session.platformAdminId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  if (!admin) {
    redirect("/api/platform-session-cleanup");
  }

  return admin;
});

// --- Branding ---------------------------------------------------------

const GYM_BRANDING_SELECT = {
  name: true,
  logoUrl: true,
  logoOnDarkUrl: true,
  logoOnLightUrl: true,
  faviconUrl: true,
  loginClaim: true,
  primaryColor: true,
  accentColor: true,
  updatedAt: true,
} as const;

// Gym ist selbst der Mandant, nicht mandantenscoped - RLS betrifft nur
// abhaengige Tabellen (siehe scoped-prisma.ts, GYM_SCOPED_MODELS). Ein
// direkter `prisma.gym.findUnique` mit manuellem `where: { id: gymId }` ist
// hier daher korrekt (gleiches Muster wie getCurrentPlatformAdmin oben).
export const getCurrentGymBranding = cache(async () => {
  const { gymId } = await verifySession();
  return prisma.gym.findUnique({ where: { id: gymId }, select: GYM_BRANDING_SELECT });
});
