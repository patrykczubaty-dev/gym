import { createHash, timingSafeEqual } from "node:crypto";

// Mobile-App-Login per Einmalcode (kein Passwort, siehe gymproject.md-Ergaenzung
// "Mobile App"). Nur Hash/Verifikation/Ablauf sind hier - die eigentliche
// Zufallserzeugung liegt bewusst in lib/otp.ts (node:crypto.randomInt ist nicht
// sinnvoll deterministisch testbar, siehe dortiger Kommentar).

export const OTP_TTL_MINUTES = 10;
export const MAX_OTP_ATTEMPTS = 5;

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// Timing-safe, damit die Vergleichsdauer keine Rueckschluesse auf richtige
// vs. falsche Ziffern zulaesst (Brute-Force-Haertung zusaetzlich zu
// MAX_OTP_ATTEMPTS).
export function verifyOtpCode(code: string, hash: string): boolean {
  const candidate = Buffer.from(hashOtpCode(code));
  const expected = Buffer.from(hash);
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function isOtpExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= expiresAt.getTime();
}

export function otpExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);
}
