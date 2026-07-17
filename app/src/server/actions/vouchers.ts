"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withGymScope } from "@/lib/scoped-prisma";
import { checkPermission } from "@/lib/permissions";
import { getCurrentEmployee } from "@/lib/dal";
import { eurosToCents } from "@/lib/money";

export type ActionState = { error: string } | undefined;

const VoucherTypeSchema = z.object({
  label: z.string().min(1, { error: "Bezeichnung ist erforderlich." }),
  validityMonths: z.coerce.number().int().min(1),
  sessionCount: z.coerce.number().int().min(1),
  priceEuros: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export async function createVoucherType(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permVouchers");
  if (permError) return permError;
  const validated = VoucherTypeSchema.safeParse({
    label: formData.get("label"),
    validityMonths: formData.get("validityMonths"),
    sessionCount: formData.get("sessionCount"),
    priceEuros: formData.get("priceEuros"),
    notes: formData.get("notes") || undefined,
  });
  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  const { priceEuros, ...rest } = validated.data;
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.voucherType.create({
      data: { ...rest, gymId, priceCents: eurosToCents(priceEuros) },
    }),
  );
  revalidatePath("/vouchers");
}

export async function updateVoucherType(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permVouchers");
  if (permError) return permError;
  const validated = VoucherTypeSchema.safeParse({
    label: formData.get("label"),
    validityMonths: formData.get("validityMonths"),
    sessionCount: formData.get("sessionCount"),
    priceEuros: formData.get("priceEuros"),
    notes: formData.get("notes") || undefined,
  });
  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  const { priceEuros, ...rest } = validated.data;
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.voucherType.update({
      where: { id },
      data: { ...rest, priceCents: eurosToCents(priceEuros) },
    }),
  );
  revalidatePath("/vouchers");
}

export async function deleteVoucherType(id: string): Promise<{ error?: string }> {
  const permError = await checkPermission("permVouchers");
  if (permError) return permError;
  const { gymId } = await getCurrentEmployee();
  const inUse = await withGymScope(gymId, (db) =>
    db.voucherAssignment.count({ where: { voucherTypeId: id } }),
  );
  if (inUse > 0) {
    return { error: "Gutschein-Typ ist noch in Verwendung und kann nicht gelöscht werden." };
  }
  await withGymScope(gymId, (db) => db.voucherType.delete({ where: { id } }));
  revalidatePath("/vouchers");
  return {};
}

export async function removeVoucherAssignment(
  customerId: string,
): Promise<{ error?: string }> {
  const permError = await checkPermission("permVouchers");
  if (permError) return permError;
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) => db.voucherAssignment.delete({ where: { customerId } }));
  revalidatePath("/vouchers/in-use");
  return {};
}
