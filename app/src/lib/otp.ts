import "server-only";
import { randomInt } from "node:crypto";
import { sendMail } from "@/lib/mail";

// Zufallserzeugung ist bewusst NICHT in lib/core/otp.ts (dort nur Hash/
// Verify/Ablauf - sinnvoll deterministisch testbar). randomInt liefert eine
// kryptographisch sichere, gleichverteilte 6-stellige Ziffernfolge (kein
// Modulo-Bias wie bei Math.random()).
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await sendMail({
    to,
    subject: "Dein Anmeldecode",
    text: `Dein Code lautet: ${code}\n\nGueltig fuer 10 Minuten. Falls du diesen Code nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
  });
}
