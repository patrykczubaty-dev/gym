"use server";

import { z } from "zod";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { withGymScope } from "@/lib/scoped-prisma";
import { checkPermission } from "@/lib/permissions";
import { getCurrentEmployee } from "@/lib/dal";

export type ActionState = { error: string } | undefined;

const TrialSchema = z.object({
  firstName: z.string().min(1, { error: "Vorname ist erforderlich." }),
  lastName: z.string().min(1, { error: "Nachname ist erforderlich." }),
  phone: z.string().optional(),
  email: z.string().optional(),
  locationId: z.string().min(1, { error: "Bitte einen Standort wählen." }),
  message: z.string().optional(),
});

export async function createTrial(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permTrials");
  if (permError) return permError;

  const validated = TrialSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    locationId: formData.get("locationId"),
    message: formData.get("message") || undefined,
  });

  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.trial.create({ data: { ...validated.data, gymId, status: "OPEN" } }),
  );
  revalidatePath("/trials");
}

const TrialStatusEnum = z.enum(["OPEN", "PROPOSED", "ACCEPTED", "DECLINED"]);

const UpdateTrialSchema = TrialSchema.extend({
  status: TrialStatusEnum,
});

export async function updateTrial(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permTrials");
  if (permError) return permError;

  const validated = UpdateTrialSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    locationId: formData.get("locationId"),
    message: formData.get("message") || undefined,
    status: formData.get("status"),
  });

  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) => db.trial.update({ where: { id }, data: validated.data }));
  revalidatePath("/trials");
}

export async function deleteTrial(id: string): Promise<{ error?: string }> {
  const permError = await checkPermission("permTrials");
  if (permError) return permError;

  const { gymId } = await getCurrentEmployee();

  const result = await withGymScope(gymId, async (db) => {
    const convertedCustomer = await db.customer.findFirst({ where: { originTrialId: id } });
    if (convertedCustomer) {
      return {
        error:
          "Dieses Probetraining ist bereits zu einem Kunden geworden und kann nicht gelöscht werden.",
      };
    }
    await db.trialProposedSlot.deleteMany({ where: { trialId: id } });
    await db.trial.delete({ where: { id } });
    return undefined;
  });

  if (result?.error) return result;

  revalidatePath("/trials");
  return {};
}

function generateToken() {
  return randomBytes(16).toString("hex");
}

const ProposeSchema = z.object({
  slot1CourseId: z.string().min(1),
  slot1Date: z.coerce.date(),
  slot2CourseId: z.string().optional(),
  slot2Date: z.coerce.date().optional(),
});

export async function proposeTrialSlots(
  trialId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permTrials");
  if (permError) return permError;

  const raw = {
    slot1CourseId: formData.get("slot1CourseId"),
    slot1Date: formData.get("slot1Date"),
    slot2CourseId: formData.get("slot2CourseId") || undefined,
    slot2Date: formData.get("slot2Date") || undefined,
  };

  const validated = ProposeSchema.safeParse(raw);
  if (!validated.success) return { error: "Bitte mindestens einen Terminvorschlag ausfüllen." };

  const slots = [
    { courseId: validated.data.slot1CourseId, startsAt: validated.data.slot1Date },
    ...(validated.data.slot2CourseId && validated.data.slot2Date
      ? [{ courseId: validated.data.slot2CourseId, startsAt: validated.data.slot2Date }]
      : []),
  ];

  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, async (db) => {
    for (const slot of slots) {
      await db.trialProposedSlot.create({
        data: { gymId, trialId, ...slot, token: generateToken(), response: "PENDING" },
      });
    }
    await db.trial.update({ where: { id: trialId }, data: { status: "PROPOSED" } });
  });

  revalidatePath("/trials");
}
