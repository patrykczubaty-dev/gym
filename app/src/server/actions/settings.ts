"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withGymScope } from "@/lib/scoped-prisma";
import { verifySession } from "@/lib/dal";
import { getCurrentEmployee } from "@/lib/dal";
import { requirePermission } from "@/lib/permissions";

export type ActionState = { error: string } | undefined;

const Schema = z.object({
  defaultNoticePeriodMonths: z.coerce.number().int().min(0),
  defaultAutoRenewalMonths: z.coerce.number().int().min(0),
});

export async function updateSettings(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifySession();
  const employee = await getCurrentEmployee();
  try {
    requirePermission(employee, "permAdmin");
  } catch {
    return { error: "Nur Administratoren können die Systemeinstellungen ändern." };
  }

  const validated = Schema.safeParse({
    defaultNoticePeriodMonths: formData.get("defaultNoticePeriodMonths"),
    defaultAutoRenewalMonths: formData.get("defaultAutoRenewalMonths"),
  });
  if (!validated.success) return { error: "Bitte die Werte prüfen." };

  await withGymScope(employee.gymId, (db) =>
    db.settings.upsert({
      where: { gymId: employee.gymId },
      create: { ...validated.data, gymId: employee.gymId },
      update: validated.data,
    }),
  );

  revalidatePath("/settings");
}

const SocialApiSchema = z.object({
  facebookPageId: z.string().optional(),
  facebookAccessToken: z.string().optional(),
  instagramBusinessAccountId: z.string().optional(),
  instagramAccessToken: z.string().optional(),
});

export async function updateSocialApiSettings(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifySession();
  const employee = await getCurrentEmployee();
  try {
    requirePermission(employee, "permAdmin");
  } catch {
    return { error: "Nur Administratoren können die Systemeinstellungen ändern." };
  }

  const validated = SocialApiSchema.safeParse({
    facebookPageId: formData.get("facebookPageId") || undefined,
    facebookAccessToken: formData.get("facebookAccessToken") || undefined,
    instagramBusinessAccountId: formData.get("instagramBusinessAccountId") || undefined,
    instagramAccessToken: formData.get("instagramAccessToken") || undefined,
  });
  if (!validated.success) return { error: "Bitte die Werte prüfen." };

  await withGymScope(employee.gymId, (db) =>
    db.settings.upsert({
      where: { gymId: employee.gymId },
      create: { ...validated.data, gymId: employee.gymId },
      update: validated.data,
    }),
  );

  revalidatePath("/settings");
}
