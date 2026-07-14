"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";

export type ActionState = { error: string } | undefined;

const ContractPlanSchema = z.object({
  name: z.string().min(1, { error: "Bezeichnung ist erforderlich." }),
  weeklyLimit: z.coerce.number().int().min(1).optional().nullable(),
  notes: z.string().optional(),
});

export async function createContractPlan(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCustomers");
  if (permError) return permError;

  const isFlatrate = formData.get("isFlatrate") === "on";
  const validated = ContractPlanSchema.safeParse({
    name: formData.get("name"),
    weeklyLimit: isFlatrate ? null : formData.get("weeklyLimit"),
    notes: formData.get("notes") || undefined,
  });
  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  await prisma.contractPlan.create({ data: validated.data });
  revalidatePath("/contract-plans");
}

export async function updateContractPlan(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCustomers");
  if (permError) return permError;

  const isFlatrate = formData.get("isFlatrate") === "on";
  const validated = ContractPlanSchema.safeParse({
    name: formData.get("name"),
    weeklyLimit: isFlatrate ? null : formData.get("weeklyLimit"),
    notes: formData.get("notes") || undefined,
  });
  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  await prisma.contractPlan.update({ where: { id }, data: validated.data });
  revalidatePath("/contract-plans");
}

export async function deleteContractPlan(id: string): Promise<{ error?: string }> {
  const permError = await checkPermission("permCustomers");
  if (permError) return permError;

  const inUse = await prisma.contractDetail.count({ where: { planId: id } });
  if (inUse > 0) {
    return { error: "Vertragsart ist noch in Verwendung und kann nicht gelöscht werden." };
  }
  await prisma.contractPlan.delete({ where: { id } });
  revalidatePath("/contract-plans");
  return {};
}
