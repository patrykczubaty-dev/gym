import "server-only";
import type { NextRequest } from "next/server";
import { verifyCustomerToken } from "@/lib/session";
import { withGymScope } from "@/lib/scoped-prisma";

// Analog zu getCurrentEmployee() in dal.ts, aber fuer Bearer-Token-API-Routes
// statt Cookie-basierte Server Components: laedt den Kunden bei JEDEM Request
// frisch aus der DB (nicht nur das JWT vertrauen) - so verliert ein Kunde
// sofort den Zugriff, sobald sein Datensatz geloescht wird, ohne dass der
// 30 Tage gueltige Token separat widerrufen werden muss.
export type MobileCustomer = {
  id: string;
  gymId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  status: string;
  contractType: string;
  expoPushToken: string | null;
};

export async function getMobileCustomer(
  request: NextRequest,
): Promise<MobileCustomer | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const payload = await verifyCustomerToken(token);
  if (!payload) return null;

  const customer = await withGymScope(payload.gymId, (db) =>
    db.customer.findUnique({
      where: { id: payload.customerId, gymId: payload.gymId },
      select: {
        id: true,
        gymId: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        contractType: true,
        expoPushToken: true,
      },
    }),
  );

  // Wie beim geloeschten Datensatz (siehe Kommentar oben) gilt dasselbe fuer
  // ein pausiertes/gekuendigtes Mitglied: der Token kann bis zu 30 Tage alt
  // sein, der Status aber jederzeit neu gesetzt werden - ab hier verliert
  // ein Kunde also SOFORT jeglichen App-Zugriff, sobald er nicht mehr
  // "ACTIVE" ist, unabhaengig davon, ob der Token selbst noch gueltig waere.
  if (!customer || customer.status !== "ACTIVE") return null;

  return customer;
}
