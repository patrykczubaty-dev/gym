"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/dal";
import { checkPermission } from "@/lib/permissions";
import {
  deleteGymUpload,
  generateFaviconFromLogo,
  LogoUploadError,
  saveGymLogo,
} from "@/lib/logo-upload";

export type ActionState = { error: string } | undefined;

const HEX_COLOR = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, { error: "Bitte einen gültigen Hex-Farbcode angeben." });

const Schema = z.object({
  studioName: z.string().trim().min(1, { error: "Der Studioname darf nicht leer sein." }),
  loginClaim: z.string().trim().max(200).optional(),
  primaryColor: HEX_COLOR,
  accentColor: z.union([HEX_COLOR, z.literal("")]).optional(),
});

function isRealUpload(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

export async function updateGymBranding(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permAdmin");
  if (permError) return permError;
  const employee = await getCurrentEmployee();

  const validated = Schema.safeParse({
    studioName: formData.get("studioName"),
    loginClaim: formData.get("loginClaim") || undefined,
    primaryColor: formData.get("primaryColor"),
    accentColor: formData.get("accentColor") || "",
  });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Bitte die Eingaben prüfen." };
  }

  const gym = await prisma.gym.findUniqueOrThrow({ where: { id: employee.gymId } });

  const data: Record<string, string | null> = {
    name: validated.data.studioName,
    loginClaim: validated.data.loginClaim || null,
    primaryColor: validated.data.primaryColor,
    accentColor: validated.data.accentColor || null,
  };

  try {
    const logoFile = formData.get("logo");
    if (isRealUpload(logoFile)) {
      data.logoUrl = await saveGymLogo(employee.gymId, "default", logoFile);
      data.faviconUrl = await generateFaviconFromLogo(employee.gymId, logoFile);
      await deleteGymUpload(gym.logoUrl);
      await deleteGymUpload(gym.faviconUrl);
    }

    const onDarkFile = formData.get("logoOnDark");
    if (isRealUpload(onDarkFile)) {
      data.logoOnDarkUrl = await saveGymLogo(employee.gymId, "on-dark", onDarkFile);
      await deleteGymUpload(gym.logoOnDarkUrl);
    }

    const onLightFile = formData.get("logoOnLight");
    if (isRealUpload(onLightFile)) {
      data.logoOnLightUrl = await saveGymLogo(employee.gymId, "on-light", onLightFile);
      await deleteGymUpload(gym.logoOnLightUrl);
    }
  } catch (err) {
    if (err instanceof LogoUploadError) return { error: err.message };
    throw err;
  }

  await prisma.gym.update({ where: { id: employee.gymId }, data });

  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

// Nimmt Prev-State/FormData entgegen, obwohl beide ungenutzt sind - so passt
// die Signatur zu useActionState() im Reset-Formular (branding-form.tsx).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function resetGymBranding(_prevState: ActionState, _formData: FormData): Promise<ActionState> {
  const permError = await checkPermission("permAdmin");
  if (permError) return permError;
  const employee = await getCurrentEmployee();

  const gym = await prisma.gym.findUniqueOrThrow({ where: { id: employee.gymId } });
  await Promise.all([
    deleteGymUpload(gym.logoUrl),
    deleteGymUpload(gym.logoOnDarkUrl),
    deleteGymUpload(gym.logoOnLightUrl),
    deleteGymUpload(gym.faviconUrl),
  ]);

  await prisma.gym.update({
    where: { id: employee.gymId },
    data: {
      logoUrl: null,
      logoOnDarkUrl: null,
      logoOnLightUrl: null,
      faviconUrl: null,
      loginClaim: null,
      primaryColor: null,
      accentColor: null,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/settings");
}
