import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/session";
import type { PermissionKey } from "@/lib/enums";

// Data Access Layer: zentraler Ort für Session-Verifikation, damit jede
// Seite/Server-Action/Route-Handler denselben Auth-Check verwendet.

export const verifySession = cache(async () => {
  const session = await getSessionPayload();
  if (!session?.employeeId) {
    redirect("/login");
  }
  return { employeeId: session.employeeId };
});

export type CurrentEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
} & Record<PermissionKey, boolean>;

// Nur die für die UI/Autorisierung nötigen Felder (kein passwordHash etc.)
export const getCurrentEmployee = cache(async (): Promise<CurrentEmployee> => {
  const session = await verifySession();

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      id: true,
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
  });

  if (!employee) {
    // Session-Cookie zeigt auf eine nicht mehr existierende Mitarbeiter-ID
    // (z.B. nach einem DB-Reset). Cookies dürfen während des Renderns einer
    // Server Component nicht gelöscht werden, daher über einen Route Handler
    // umleiten, der das Cookie entfernt - sonst hält proxy.ts den Nutzer
    // fälschlich für eingeloggt und es entsteht eine Redirect-Schleife
    // zwischen /login und /dashboard.
    redirect("/api/session-cleanup");
  }

  return employee;
});
