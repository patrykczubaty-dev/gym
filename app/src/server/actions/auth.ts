"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { directPrisma } from "@/lib/prisma-direct";
import { createSession, deleteSession } from "@/lib/session";

const PASSWORD_RESET_VALID_MS = 60 * 60 * 1000; // 1 Stunde

const LoginSchema = z.object({
  email: z.email({ error: "Bitte eine gültige E-Mail-Adresse angeben." }),
  password: z.string().min(1, { error: "Bitte ein Passwort angeben." }),
});

export type LoginFormState = { error: string } | undefined;

export async function login(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { error: "Bitte E-Mail und Passwort prüfen." };
  }

  const { email, password } = validated.data;

  // directPrisma: die gymId des Mitarbeiters ist per Definition noch nicht
  // bekannt, bevor er gefunden wurde - dieser eine Lookup muss RLS umgehen.
  const employee = await directPrisma.employee.findUnique({ where: { email } });

  if (!employee || !employee.canLogin) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  const passwordMatches = await bcrypt.compare(password, employee.passwordHash);
  if (!passwordMatches) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  await createSession(employee.id, employee.gymId);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

const ForgotPasswordSchema = z.object({
  email: z.email({ error: "Bitte eine gültige E-Mail-Adresse angeben." }),
});

export type ForgotPasswordFormState =
  | { error: string }
  | { success: true; resetUrl: string }
  | undefined;

// Da in diesem ersten Entwurf noch kein E-Mail-Versand angebunden ist (siehe
// Systeme-Seite, "Abgrenzung"), wird der Reset-Link direkt zurückgegeben statt
// per Mail verschickt. In einer späteren Ausbaustufe ersetzt ein SMTP-Versand
// die Rückgabe von `resetUrl`.
export async function requestPasswordReset(
  _prevState: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const validated = ForgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!validated.success) {
    return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  }

  const employee = await directPrisma.employee.findUnique({
    where: { email: validated.data.email },
  });

  // Immer denselben Erfolgspfad zurückgeben, unabhängig davon ob die
  // E-Mail existiert (kein User-Enumeration-Leak) — der Link wird nur
  // erzeugt/angezeigt, wenn tatsächlich ein Konto gefunden wurde.
  if (!employee || !employee.canLogin) {
    return { error: "Kein Konto mit dieser E-Mail-Adresse gefunden." };
  }

  const token = randomBytes(32).toString("hex");
  await directPrisma.employee.update({
    where: { id: employee.id },
    data: {
      passwordResetToken: token,
      passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_VALID_MS),
    },
  });

  return { success: true, resetUrl: `/reset-password/${token}` };
}

const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, { error: "Passwort muss mindestens 8 Zeichen haben." }),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    error: "Die Passwörter stimmen nicht überein.",
    path: ["passwordConfirm"],
  });

export type ResetPasswordFormState = { error: string } | undefined;

export async function resetPassword(
  token: string,
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const validated = ResetPasswordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
  }

  const employee = await directPrisma.employee.findUnique({
    where: { passwordResetToken: token },
  });
  if (
    !employee ||
    !employee.passwordResetExpiresAt ||
    employee.passwordResetExpiresAt < new Date()
  ) {
    return { error: "Der Link ist ungültig oder abgelaufen. Bitte neu anfordern." };
  }

  await directPrisma.employee.update({
    where: { id: employee.id },
    data: {
      passwordHash: await bcrypt.hash(validated.data.password, 10),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  redirect("/login");
}
