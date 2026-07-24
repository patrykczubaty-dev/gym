"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withGymScope } from "@/lib/scoped-prisma";
import { checkPermission } from "@/lib/permissions";
import { getCurrentEmployee } from "@/lib/dal";

export type ActionState = { error: string } | undefined;

// Events sind bewusst 1:1 mit ihrem Kalendertermin (kein wiederkehrendes
// Event, siehe Absprache) - anders als Kurse gibt es hier keinen separaten
// "Typ ohne Datum" mehr. Anlegen/Bearbeiten/Löschen passiert deshalb in
// einem Schritt inkl. Termin, nicht mehr getrennt über den Kalender.
const EventScheduleSchema = z
  .object({
    title: z.string().min(1, { error: "Bezeichnung ist erforderlich." }),
    description: z.string().optional(),
    participantLimit: z.coerce.number().int().min(1),
    locationId: z.string().min(1, { error: "Bitte einen Standort wählen." }),
    dateMode: z.enum(["single", "range"]),
    date: z.coerce.date().optional(),
    startHour: z.coerce.number().int().min(0).max(23).optional(),
    durationMinutes: z.coerce.number().int().min(5).max(2880).optional(),
    fromDate: z.coerce.date().optional(),
    fromHour: z.coerce.number().int().min(0).max(23).optional(),
    toDate: z.coerce.date().optional(),
    toHour: z.coerce.number().int().min(0).max(23).optional(),
  })
  .refine(
    (data) =>
      data.dateMode === "single"
        ? data.date !== undefined && data.startHour !== undefined && data.durationMinutes !== undefined
        : data.fromDate !== undefined &&
          data.fromHour !== undefined &&
          data.toDate !== undefined &&
          data.toHour !== undefined,
    { error: "Bitte alle Datums-/Zeitfelder ausfüllen." },
  );

function parse(formData: FormData) {
  return EventScheduleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    participantLimit: formData.get("participantLimit"),
    locationId: formData.get("locationId"),
    dateMode: formData.get("dateMode"),
    date: formData.get("date") || undefined,
    startHour: formData.get("startHour") || undefined,
    durationMinutes: formData.get("durationMinutes") || undefined,
    fromDate: formData.get("fromDate") || undefined,
    fromHour: formData.get("fromHour") || undefined,
    toDate: formData.get("toDate") || undefined,
    toHour: formData.get("toHour") || undefined,
  });
}

function computeSchedule(data: z.infer<typeof EventScheduleSchema>): { startsAt: Date; endsAt: Date } | { error: string } {
  if (data.dateMode === "single") {
    const startsAt = new Date(data.date!);
    startsAt.setHours(data.startHour!, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + data.durationMinutes! * 60_000);
    return { startsAt, endsAt };
  }
  const startsAt = new Date(data.fromDate!);
  startsAt.setHours(data.fromHour!, 0, 0, 0);
  const endsAt = new Date(data.toDate!);
  endsAt.setHours(data.toHour!, 0, 0, 0);
  if (endsAt <= startsAt) {
    return { error: "Das Ende muss nach dem Start liegen." };
  }
  return { startsAt, endsAt };
}

export async function createEventWithSchedule(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;
  const validated = parse(formData);
  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  const schedule = computeSchedule(validated.data);
  if ("error" in schedule) return schedule;

  const { title, description, participantLimit, locationId } = validated.data;
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.event.create({
      data: {
        gymId,
        title,
        description,
        participantLimit,
        locations: { connect: [{ id: locationId }] },
        calendarEvents: {
          create: {
            gymId,
            locationId,
            startsAt: schedule.startsAt,
            endsAt: schedule.endsAt,
            capacity: participantLimit,
          },
        },
      },
    }),
  );
  revalidatePath("/events");
  revalidatePath("/calendar");
}

export async function updateEventWithSchedule(
  eventId: string,
  calendarEventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;
  const validated = parse(formData);
  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  const schedule = computeSchedule(validated.data);
  if ("error" in schedule) return schedule;

  const { title, description, participantLimit, locationId } = validated.data;
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, async (db) => {
    await db.event.update({
      where: { id: eventId },
      data: {
        title,
        description,
        participantLimit,
        locations: { set: [{ id: locationId }] },
      },
    });
    await db.calendarEvent.update({
      where: { id: calendarEventId },
      data: {
        locationId,
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
        capacity: participantLimit,
      },
    });
  });
  revalidatePath("/events");
  revalidatePath("/calendar");
}

export async function getAffectedBookingsCountForEvent(
  calendarEventId: string,
): Promise<{ count: number } | { error: string }> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;
  const { gymId } = await getCurrentEmployee();
  return withGymScope(gymId, async (db) => {
    const count = await db.booking.count({
      where: { calendarEventId, status: { in: ["BOOKED", "WAITLISTED"] } },
    });
    return { count };
  });
}

// Loescht Termin + Event zusammen (1:1-Beziehung, siehe oben) - anders als
// bei Kursen gibt es keinen eigenstaendigen "Typ", der ohne Termin
// weiterbestehen koennte.
export async function deleteEventWithSchedule(
  eventId: string,
  calendarEventId: string,
): Promise<{ error?: string }> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;
  const { gymId } = await getCurrentEmployee();

  await withGymScope(gymId, async (db) => {
    await db.booking.deleteMany({ where: { calendarEventId } });
    await db.calendarEvent.delete({ where: { id: calendarEventId } });
    await db.event.delete({ where: { id: eventId } });
  });
  revalidatePath("/events");
  revalidatePath("/calendar");
  return {};
}
