import { NextRequest, NextResponse } from "next/server";
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

  return NextResponse.json({
    profile: {
      firstName: full.firstName,
      lastName: full.lastName,
      email: full.email,
      phone: full.phone,
      mobile: full.mobile,
      status: full.status,
      contractType: full.contractType,
      joinedAt: full.joinedAt,
    },
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
