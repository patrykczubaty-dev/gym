import { NextRequest, NextResponse } from "next/server";
import { startOfWeek, endOfWeek } from "date-fns";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";

export async function GET(request: NextRequest) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const full = await withGymScope(customer.gymId, (db) =>
    db.customer.findUnique({
      where: { id: customer.id },
      include: {
        contract: { include: { plan: true } },
        voucher: { include: { voucherType: true } },
      },
    }),
  );
  if (!full) {
    return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 });
  }

  // Fuer die Wochenpensum-Zeile im Profil (analog zum Start-Hero) - dasselbe
  // Kontingent, hier nur zusaetzlich verfuegbar gemacht statt einen
  // separaten Fetch im Profil-Screen zu brauchen.
  const weeklyLimit = full.contract?.plan.weeklyLimit ?? null;
  let usedThisWeek: number | null = null;
  if (weeklyLimit !== null) {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    usedThisWeek = await withGymScope(customer.gymId, (db) =>
      db.booking.count({
        where: {
          customerId: customer.id,
          // Wartelistenplaetze zaehlen wie Buchungen gegen das Kontingent
          // (siehe Absprache) - Events zaehlen nicht mit.
          status: { in: ["BOOKED", "WAITLISTED"] },
          calendarEvent: { startsAt: { gte: weekStart, lte: weekEnd }, courseId: { not: null } },
        },
      }),
    );
  }

  return NextResponse.json({
    profile: {
      id: full.id,
      firstName: full.firstName,
      lastName: full.lastName,
      email: full.email,
      phone: full.phone,
      mobile: full.mobile,
      status: full.status,
      contractType: full.contractType,
      joinedAt: full.joinedAt,
    },
    weeklyQuota: weeklyLimit === null ? null : { limit: weeklyLimit, usedThisWeek: usedThisWeek! },
    contract: full.contract
      ? {
          planName: full.contract.plan.name,
          contractEndDate: full.contract.contractEndDate,
          cancellationPossibleUntil: full.contract.cancellationPossibleUntil,
          cancellationEffectiveAt: full.contract.cancellationEffectiveAt,
          cancellationReceivedAt: full.contract.cancellationReceivedAt,
          autoRenewed: full.contract.autoRenewed,
          pausedFrom: full.contract.pausedFrom,
          pausedTo: full.contract.pausedTo,
        }
      : null,
    voucher: full.voucher
      ? {
          typeLabel: full.voucher.voucherType.label,
          remainingSessions: full.voucher.remainingSessions,
          validUntil: full.voucher.validUntil,
        }
      : null,
  });
}
