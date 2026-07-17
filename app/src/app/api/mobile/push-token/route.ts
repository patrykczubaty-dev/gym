import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";

const Schema = z.object({ expoPushToken: z.string().min(1) });

export async function POST(request: NextRequest) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validated = Schema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  await withGymScope(customer.gymId, (db) =>
    db.customer.update({
      where: { id: customer.id },
      data: { expoPushToken: validated.data.expoPushToken },
    }),
  );

  return NextResponse.json({ ok: true });
}
