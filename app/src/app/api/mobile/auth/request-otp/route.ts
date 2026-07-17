import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { directPrisma } from "@/lib/prisma-direct";
import { hashOtpCode, otpExpiresAt, OTP_TTL_MINUTES } from "@/lib/core/otp";
import { generateOtpCode, sendOtpEmail } from "@/lib/otp";

const Schema = z.object({ email: z.email() });

// Generische Erfolgsmeldung unabhaengig davon, ob die E-Mail existiert -
// verhindert, dass sich diese Route zum Durchprobieren/Aufzaehlen
// existierender Kunden-E-Mails missbrauchen laesst (User-Enumeration).
const GENERIC_RESPONSE = {
  message: "Falls ein Konto mit dieser E-Mail existiert, wurde ein Code gesendet.",
};

// Verhindert E-Mail-Flooding durch wiederholtes Anfordern - ein neuer Code
// kann erst angefordert werden, wenn der vorherige seine halbe Gueltigkeit
// ueberschritten hat.
const MIN_RESEND_INTERVAL_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const validated = Schema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Bitte eine gültige E-Mail-Adresse angeben." }, { status: 400 });
  }

  // directPrisma: die E-Mail ist der einzige Anhaltspunkt, die gymId des
  // Kunden ist per Definition noch nicht bekannt (gleiche Ausnahme wie beim
  // Employee-Login, siehe prisma-direct.ts).
  const customer = await directPrisma.customer.findUnique({
    where: { email: validated.data.email },
    select: { id: true, email: true, otpExpiresAt: true },
  });

  if (customer?.email) {
    const ttlMs = OTP_TTL_MINUTES * 60 * 1000;
    const alreadySentRecently =
      customer.otpExpiresAt &&
      customer.otpExpiresAt.getTime() - Date.now() > ttlMs - MIN_RESEND_INTERVAL_MS;
    if (!alreadySentRecently) {
      const code = generateOtpCode();
      await directPrisma.customer.update({
        where: { id: customer.id },
        data: { otpCodeHash: hashOtpCode(code), otpExpiresAt: otpExpiresAt(), otpAttempts: 0 },
      });
      await sendOtpEmail(customer.email, code);
    }
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
