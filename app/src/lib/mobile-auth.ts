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

  return withGymScope(payload.gymId, (db) =>
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
}
