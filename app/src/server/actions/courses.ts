"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withGymScope } from "@/lib/scoped-prisma";
import { checkPermission } from "@/lib/permissions";
import { getCurrentEmployee } from "@/lib/dal";

export type ActionState = { error: string } | undefined;

const CourseSchema = z.object({
  title: z.string().min(1, { error: "Bezeichnung ist erforderlich." }),
  description: z.string().optional(),
  leadTrainerId: z.string().min(1, { error: "Bitte einen Trainer wählen." }),
  participantLimit: z.coerce.number().int().min(1),
  trialPossible: z.coerce.boolean(),
  trialDate: z.coerce.date().optional().nullable(),
  cancellationCutoffHours: z.coerce.number().int().min(0).optional().nullable(),
  waitlistLimit: z.coerce.number().int().min(0).optional().nullable(),
  durationMinutes: z.coerce.number().int().min(5).max(720).optional().nullable(),
  locationIds: z.array(z.string()).min(1, { error: "Bitte mindestens einen Standort wählen." }),
});

function parse(formData: FormData) {
  return CourseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    leadTrainerId: formData.get("leadTrainerId"),
    participantLimit: formData.get("participantLimit"),
    trialPossible: formData.get("trialPossible") === "yes",
    trialDate: formData.get("trialDate") || null,
    cancellationCutoffHours: formData.get("cancellationCutoffHours") || null,
    waitlistLimit: formData.get("waitlistLimit") || null,
    durationMinutes: formData.get("durationMinutes") || null,
    locationIds: formData.getAll("locationIds"),
  });
}

export async function createCourse(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;
  const validated = parse(formData);
  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  const { locationIds, ...rest } = validated.data;
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.course.create({
      data: { ...rest, gymId, locations: { connect: locationIds.map((id) => ({ id })) } },
    }),
  );
  revalidatePath("/courses");
}

export async function updateCourse(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;
  const validated = parse(formData);
  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  const { locationIds, ...rest } = validated.data;
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.course.update({
      where: { id },
      data: { ...rest, locations: { set: locationIds.map((lid) => ({ id: lid })) } },
    }),
  );
  revalidatePath("/courses");
}

export async function deleteCourse(id: string): Promise<{ error?: string }> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;
  const { gymId } = await getCurrentEmployee();
  const eventCount = await withGymScope(gymId, (db) =>
    db.calendarEvent.count({ where: { courseId: id } }),
  );
  if (eventCount > 0) {
    return {
      error: "Kurs kann nicht gelöscht werden, solange Kalendertermine existieren.",
    };
  }
  await withGymScope(gymId, (db) => db.course.delete({ where: { id } }));
  revalidatePath("/courses");
  return {};
}
