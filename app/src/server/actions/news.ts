"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withGymScope } from "@/lib/scoped-prisma";
import { checkPermission } from "@/lib/permissions";
import { getCurrentEmployee } from "@/lib/dal";

export type ActionState = { error: string } | undefined;

const NewsSchema = z.object({
  subject: z.string().min(1, { error: "Betreff ist erforderlich." }),
  message: z.string().min(1, { error: "Nachricht ist erforderlich." }),
  imageUrls: z.string().optional(),
  locationIds: z.array(z.string()),
  publishOnWebsite: z.coerce.boolean(),
  publishOnFacebook: z.coerce.boolean(),
  publishOnInstagram: z.coerce.boolean(),
  sendNow: z.coerce.boolean(),
});

export async function createNews(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permNews");
  if (permError) return permError;

  const validated = NewsSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
    imageUrls: formData.get("imageUrls") || undefined,
    locationIds: formData.getAll("locationIds"),
    publishOnWebsite: formData.get("publishOnWebsite") === "on",
    publishOnFacebook: formData.get("publishOnFacebook") === "on",
    publishOnInstagram: formData.get("publishOnInstagram") === "on",
    sendNow: formData.get("sendNow") === "on",
  });

  if (!validated.success) return { error: "Bitte Betreff und Nachricht prüfen." };

  const { locationIds, sendNow, imageUrls, ...rest } = validated.data;
  const urls = (imageUrls ?? "")
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.news.create({
      data: {
        ...rest,
        gymId,
        status: sendNow ? "SENT" : "DRAFT",
        sentAt: sendNow ? new Date() : null,
        locations: { connect: locationIds.map((id) => ({ id })) },
        attachments: {
          // gymId muss hier manuell mit, da die scoped-prisma-Extension nur
          // Top-Level-Operationen abfaengt, nicht verschachtelte Writes
          // innerhalb desselben create()-Aufrufs (siehe scoped-prisma.ts).
          create: urls.map((url) => ({ gymId, fileName: url.split("/").pop() ?? url, url })),
        },
      },
    }),
  );

  revalidatePath("/news");
}

export async function archiveNews(id: string): Promise<{ error?: string }> {
  const permError = await checkPermission("permNews");
  if (permError) return permError;
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.news.update({ where: { id }, data: { status: "ARCHIVED" } }),
  );
  revalidatePath("/news");
  return {};
}

export async function sendNews(id: string): Promise<{ error?: string }> {
  const permError = await checkPermission("permNews");
  if (permError) return permError;
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.news.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    }),
  );
  revalidatePath("/news");
  return {};
}
