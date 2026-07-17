import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { directPrisma } from "@/lib/prisma-direct";
import { isOtpExpired, verifyOtpCode, MAX_OTP_ATTEMPTS } from "@/lib/core/otp";
import { createCustomerToken } from "@/lib/session";

const Schema = z.object({ email: z.email(), code: z.string().length(6) });

const INVALID = { error: "Code ungültig oder abgelaufen." } as const;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const validated = Schema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(INVALID, { status: 401 });
  }

  const customer = await directPrisma.customer.findUnique({
    where: { email: validated.data.email },
    select: {
      id: true,
      gymId: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      contractType: true,
      otpCodeHash: true,
      otpExpiresAt: true,
      otpAttempts: true,
    },
  });

  if (
    !customer?.otpCodeHash ||
    !customer.otpExpiresAt ||
    isOtpExpired(customer.otpExpiresAt) ||
    customer.otpAttempts >= MAX_OTP_ATTEMPTS
  ) {
    return NextResponse.json(INVALID, { status: 401 });
  }

  if (!verifyOtpCode(validated.data.code, customer.otpCodeHash)) {
    await directPrisma.customer.update({
      where: { id: customer.id },
      data: { otpAttempts: { increment: 1 } },
    });
    return NextResponse.json(INVALID, { status: 401 });
  }

  // Code ist einmal gueltig - nach erfolgreicher Verifikation sofort
  // verbrauchen, damit er kein zweites Mal (z.B. bei abgefangener E-Mail)
  // eingeloest werden kann.
  await directPrisma.customer.update({
    where: { id: customer.id },
    data: { otpCodeHash: null, otpExpiresAt: null, otpAttempts: 0 },
  });

  const token = await createCustomerToken(customer.id, customer.gymId);

  return NextResponse.json({
    token,
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      status: customer.status,
      contractType: customer.contractType,
    },
  });
}
