"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

const LocationSchema = z.object({
  city: z.string().min(1, { error: "Ort ist erforderlich." }),
  street: z.string().min(1, { error: "Strasse ist erforderlich." }),
  zip: z.string().min(1, { error: "PLZ ist erforderlich." }),
  notes: z.string().optional(),
});

export type LocationFormState = { error: string } | undefined;

export async function createLocation(
  _prevState: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  await verifySession();

  const validated = LocationSchema.safeParse({
    city: formData.get("city"),
    street: formData.get("street"),
    zip: formData.get("zip"),
    notes: formData.get("notes") || undefined,
  });

  if (!validated.success) {
    return { error: "Bitte alle Pflichtfelder ausfüllen." };
  }

  await prisma.location.create({ data: validated.data });
  revalidatePath("/locations");
}

export async function updateLocation(
  id: string,
  _prevState: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  await verifySession();

  const validated = LocationSchema.safeParse({
    city: formData.get("city"),
    street: formData.get("street"),
    zip: formData.get("zip"),
    notes: formData.get("notes") || undefined,
  });

  if (!validated.success) {
    return { error: "Bitte alle Pflichtfelder ausfüllen." };
  }

  await prisma.location.update({ where: { id }, data: validated.data });
  revalidatePath("/locations");
}

export async function deleteLocation(id: string): Promise<{ error?: string }> {
  await verifySession();

  const customerCount = await prisma.customer.count({
    where: { locationId: id },
  });

  if (customerCount > 0) {
    return {
      error:
        "Standort kann nicht gelöscht werden, solange ihm Kunden zugeteilt sind.",
    };
  }

  await prisma.location.delete({ where: { id } });
  revalidatePath("/locations");
  return {};
}
