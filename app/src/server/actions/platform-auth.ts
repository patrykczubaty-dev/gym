"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createPlatformSession, deletePlatformSession } from "@/lib/session";

// PlatformAdmin traegt kein gymId und ist von RLS ausgenommen (siehe
// schema.prisma) - der normale (app_user-)Client reicht hier aus.

const PASSWORD_RESET_VALID_MS = 60 * 60 * 1000; // 1 Stunde

const LoginSchema = z.object({
  email: z.email({ error: "Bitte eine gültige E-Mail-Adresse angeben." }),
  password: z.string().min(1, { error: "Bitte ein Passwort angeben." }),
});

export type LoginFormState = { error: string } | undefined;

export async function platformLogin(
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
  const admin = await prisma.platformAdmin.findUnique({ where: { email } });
  if (!admin) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatches) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  await createPlatformSession(admin.id);
  redirect("/platform");
}

export async function platformLogout() {
  await deletePlatformSession();
  redirect("/platform/login");
}

const ForgotPasswordSchema = z.object({
  email: z.email({ error: "Bitte eine gültige E-Mail-Adresse angeben." }),
});

export type ForgotPasswordFormState =
  | { error: string }
  | { success: true; resetUrl: string }
  | undefined;

export async function requestPlatformPasswordReset(
  _prevState: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const validated = ForgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!validated.success) {
    return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  }

  const admin = await prisma.platformAdmin.findUnique({ where: { email: validated.data.email } });
  if (!admin) {
    return { error: "Kein Konto mit dieser E-Mail-Adresse gefunden." };
  }

  const token = randomBytes(32).toString("hex");
  await prisma.platformAdmin.update({
    where: { id: admin.id },
    data: {
      passwordResetToken: token,
      passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_VALID_MS),
    },
  });

  return { success: true, resetUrl: `/platform/reset-password/${token}` };
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

export async function resetPlatformPassword(
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

  const admin = await prisma.platformAdmin.findUnique({ where: { passwordResetToken: token } });
  if (!admin || !admin.passwordResetExpiresAt || admin.passwordResetExpiresAt < new Date()) {
    return { error: "Der Link ist ungültig oder abgelaufen. Bitte neu anfordern." };
  }

  await prisma.platformAdmin.update({
    where: { id: admin.id },
    data: {
      passwordHash: await bcrypt.hash(validated.data.password, 10),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  redirect("/platform/login");
}
