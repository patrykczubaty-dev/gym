"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withGymScope } from "@/lib/scoped-prisma";
import { checkPermission } from "@/lib/permissions";
import { getCurrentEmployee } from "@/lib/dal";

export type ActionState = { error: string } | undefined;

const EventTypeSchema = z.object({
  title: z.string().min(1, { error: "Bezeichnung ist erforderlich." }),
  description: z.string().optional(),
  participantLimit: z.coerce.number().int().min(1),
  locationIds: z.array(z.string()).min(1, { error: "Bitte mindestens einen Standort wählen." }),
});

function parse(formData: FormData) {
  return EventTypeSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    participantLimit: formData.get("participantLimit"),
    locationIds: formData.getAll("locationIds"),
  });
}

export async function createEvent(
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
    db.event.create({
      data: { ...rest, gymId, locations: { connect: locationIds.map((id) => ({ id })) } },
    }),
  );
  revalidatePath("/events");
}

export async function updateEvent(
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
    db.event.update({
      where: { id },
      data: { ...rest, locations: { set: locationIds.map((lid) => ({ id: lid })) } },
    }),
  );
  revalidatePath("/events");
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;
  const { gymId } = await getCurrentEmployee();
  const count = await withGymScope(gymId, (db) =>
    db.calendarEvent.count({ where: { eventId: id } }),
  );
  if (count > 0) {
    return {
      error: "Event kann nicht gelöscht werden, solange Kalendertermine existieren.",
    };
  }
  await withGymScope(gymId, (db) => db.event.delete({ where: { id } }));
  revalidatePath("/events");
  return {};
}
