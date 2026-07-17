import { NextRequest, NextResponse } from "next/server";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";
import { calculateContractCancellation } from "@/lib/core/cancellation";

// Self-Service-Kuendigung (Mobile-App-Quiz: MUSS in v1) - nutzt dieselbe
// bereits getestete Kernlogik wie das Employee-Backend (customers.ts), damit
// beide Wege garantiert dasselbe Ergebnis berechnen.
export async function POST(request: NextRequest) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const result = await withGymScope(customer.gymId, async (db) => {
    const full = await db.customer.findUnique({
      where: { id: customer.id },
      include: { contract: true },
    });

    if (!full?.contract) {
      return { error: "Kein Vertrag hinterlegt.", status: 404 } as const;
    }
    if (full.contract.cancellationReceivedAt) {
      return { error: "Der Vertrag wurde bereits gekündigt.", status: 409 } as const;
    }

    const now = new Date();
    const calc = calculateContractCancellation({
      joinedAt: full.joinedAt,
      termMonths: full.contract.termMonths,
      autoRenewalMonths: full.contract.autoRenewalMonths,
      noticePeriodMonths: full.contract.noticePeriodMonths,
      pausedFrom: full.contract.pausedFrom,
      pausedTo: full.contract.pausedTo,
      cancellationReceivedAt: now,
    });

    const updated = await db.contractDetail.update({
      where: { customerId: customer.id },
      data: {
        cancellationReceivedAt: now,
        contractEndDate: calc.contractEndDate,
        cancellationPossibleUntil: calc.cancellationPossibleUntil,
        cancellationEffectiveAt: calc.cancellationEffectiveAt,
        autoRenewed: calc.autoRenewed,
      },
    });

    return { updated } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    cancellationReceivedAt: result.updated.cancellationReceivedAt,
    cancellationEffectiveAt: result.updated.cancellationEffectiveAt,
    autoRenewed: result.updated.autoRenewed,
  });
}
