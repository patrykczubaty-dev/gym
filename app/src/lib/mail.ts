import "server-only";
import nodemailer from "nodemailer";

// Zentrale Mail-Versand-Abstraktion. Ohne SMTP-Konfiguration (lokale
// Entwicklung, noch keine Zugangsdaten vom Hoster) wird der Inhalt nur ins
// Server-Log geschrieben statt wirklich versendet - klar sichtbar markiert,
// damit das nie unbemerkt in Produktion landet. Sobald SMTP_HOST & Co. in
// der .env gesetzt sind, greift automatisch der echte Versand.
const SMTP_HOST = process.env.SMTP_HOST;

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    })
  : null;

const FROM_ADDRESS = process.env.SMTP_FROM ?? "no-reply@beeplus.app";

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!transporter) {
    console.log(
      `[mail:DEV - nicht wirklich versendet] an=${options.to} betreff="${options.subject}"\n${options.text}`,
    );
    return;
  }
  await transporter.sendMail({ from: FROM_ADDRESS, ...options });
}
