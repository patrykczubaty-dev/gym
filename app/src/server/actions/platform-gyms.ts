"use server";

import { z } from "zod";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { directPrisma } from "@/lib/prisma-direct";
import { verifyPlatformSession } from "@/lib/dal";

export type ActionState = { error: string } | { success: true; resetUrl: string } | undefined;

// Kombinierende diakritische Zeichen (U+0300-U+036F) nach NFD-Normalisierung
// entfernen, damit z.B. "Fitness München" zu "fitness-munchen" wird.
const COMBINING_MARKS = /[̀-ͯ]/g;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const CreateGymSchema = z.object({
  name: z.string().min(1, { error: "Name ist erforderlich." }),
  contactEmail: z.string().optional(),
  adminFirstName: z.string().min(1, { error: "Vorname ist erforderlich." }),
  adminLastName: z.string().min(1, { error: "Nachname ist erforderlich." }),
  adminEmail: z.email({ error: "Bitte eine gültige E-Mail-Adresse angeben." }),
  city: z.string().min(1, { error: "Ort ist erforderlich." }),
  street: z.string().min(1, { error: "Strasse ist erforderlich." }),
  zip: z.string().min(1, { error: "PLZ ist erforderlich." }),
});

// Onboarding: legt Gym + 1. Standort + Settings + 1. Admin-Mitarbeiter in
// einer Transaktion an. Laeuft bewusst ueber directPrisma (RLS-Bypass) - ein
// Plattform-Admin agiert ausserhalb jedes Gym-Kontexts, es gibt hier keine
// gymId, in die man scopen koennte (die wird ja gerade erst erzeugt).
export async function createGym(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifyPlatformSession();

  const validated = CreateGymSchema.safeParse({
    name: formData.get("name"),
    contactEmail: formData.get("contactEmail") || undefined,
    adminFirstName: formData.get("adminFirstName"),
    adminLastName: formData.get("adminLastName"),
    adminEmail: formData.get("adminEmail"),
    city: formData.get("city"),
    street: formData.get("street"),
    zip: formData.get("zip"),
  });
  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  const { name, contactEmail, adminFirstName, adminLastName, adminEmail, city, street, zip } =
    validated.data;

  const existingEmployee = await directPrisma.employee.findUnique({
    where: { email: adminEmail },
  });
  if (existingEmployee) {
    return { error: "Diese E-Mail-Adresse ist bereits als Mitarbeiter-Login vergeben." };
  }

  const baseSlug = slugify(name) || "gym";
  let slug = baseSlug;
  let suffix = 1;
  while (await directPrisma.gym.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const resetToken = randomBytes(32).toString("hex");
  const placeholderPasswordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  await directPrisma.$transaction(async (tx) => {
    const gym = await tx.gym.create({
      data: { name, slug, contactEmail },
    });
    const location = await tx.location.create({
      data: { gymId: gym.id, city, street, zip },
    });
    await tx.settings.create({ data: { gymId: gym.id } });
    await tx.employee.create({
      data: {
        gymId: gym.id,
        locationId: location.id,
        firstName: adminFirstName,
        lastName: adminLastName,
        email: adminEmail,
        gender: "w",
        birthday: new Date(1990, 0, 1),
        employeeSince: new Date(),
        passwordHash: placeholderPasswordHash,
        passwordResetToken: resetToken,
        passwordResetExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        permAdmin: true,
      },
    });
  });

  revalidatePath("/platform");
  return { success: true, resetUrl: `/reset-password/${resetToken}` };
}

export async function suspendGym(gymId: string): Promise<{ error?: string }> {
  await verifyPlatformSession();
  await prisma.gym.update({ where: { id: gymId }, data: { status: "SUSPENDED" } });
  revalidatePath("/platform");
  return {};
}

export async function reactivateGym(gymId: string): Promise<{ error?: string }> {
  await verifyPlatformSession();
  await prisma.gym.update({ where: { id: gymId }, data: { status: "ACTIVE" } });
  revalidatePath("/platform");
  return {};
}
