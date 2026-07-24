"use server";

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { addYears } from "date-fns";
import { revalidatePath } from "next/cache";
import { withGymScope } from "@/lib/scoped-prisma";
import { checkPermission } from "@/lib/permissions";
import { getCurrentEmployee } from "@/lib/dal";
import { getWeeklyOccurrences } from "@/lib/core/recurrence";
import { isGermanPublicHoliday } from "@/lib/core/holidays";
import { cancelBookingAndNotifyWaitlist } from "@/server/booking-cancellation";
import { sendExpoPush } from "@/lib/push";

export type ActionState = { error: string } | undefined;

// Kein explizites Enddatum ("nie endend"): es werden trotzdem konkrete
// CalendarEvent-Zeilen angelegt (kein dynamisches Nachgenerieren), begrenzt auf
// diesen praktischen Planungshorizont statt echter Unendlichkeit.
const OPEN_ENDED_HORIZON_YEARS = 2;

const SubjectSchema = z.object({
  subjectType: z.enum(["course", "event"], { error: "Bitte Kurs oder Event wählen." }),
  subjectId: z.string().min(1, { error: "Bitte einen Kurs oder ein Event wählen." }),
});

const SingleEventSchema = SubjectSchema.extend({
  locationId: z.string().min(1, { error: "Bitte einen Standort wählen." }),
  date: z.coerce.date({ error: "Bitte ein Datum angeben." }),
  startHour: z.coerce.number().int().min(0).max(23),
  durationMinutes: z.coerce.number().int().min(5).max(720),
  capacity: z.coerce.number().int().min(1),
});

const WeeklyEventSchema = SubjectSchema.extend({
  locationId: z.string().min(1, { error: "Bitte einen Standort wählen." }),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startHour: z.coerce.number().int().min(0).max(23),
  durationMinutes: z.coerce.number().int().min(5).max(720),
  capacity: z.coerce.number().int().min(1),
  from: z.coerce.date({ error: "Bitte ein Startdatum angeben." }),
  to: z.coerce.date().optional().nullable(),
});

function subjectField(subjectType: "course" | "event", subjectId: string) {
  return subjectType === "course" ? { courseId: subjectId } : { eventId: subjectId };
}

export type EditScope = "single" | "following" | "series";

// Filter fuer "diesen und alle folgenden" bzw. "ganze Serie" - null bedeutet
// "nur der eine Termin" (auch der Fallback ausserhalb einer Serie, da
// seriesId dann null ist und scope somit keine Wirkung haben kann).
function scopeWhere(event: { seriesId: string | null; startsAt: Date }, scope: EditScope) {
  if (scope === "single" || !event.seriesId) return null;
  return scope === "series"
    ? { seriesId: event.seriesId }
    : { seriesId: event.seriesId, startsAt: { gte: event.startsAt } };
}

export async function getAffectedBookingsCount(
  eventId: string,
  scope: EditScope,
): Promise<{ count: number } | { error: string }> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;
  const { gymId } = await getCurrentEmployee();
  return withGymScope(gymId, async (db) => {
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId },
      select: { id: true, seriesId: true, startsAt: true },
    });
    if (!event) return { error: "Termin nicht gefunden." };
    const where = scopeWhere(event, scope);
    const ids = where
      ? (await db.calendarEvent.findMany({ where, select: { id: true } })).map((r) => r.id)
      : [event.id];
    const count = await db.booking.count({
      where: { calendarEventId: { in: ids }, status: { in: ["BOOKED", "WAITLISTED"] } },
    });
    return { count };
  });
}

// Loescht Bookings VOR dem CalendarEvent (statt storniert stehen zu lassen) -
// eine geloeschte Terminzeile darf keine Fremdschluessel-Referenzen mehr
// haben. Betroffene Kunden sehen den Termin danach schlicht nicht mehr in
// ihren Buchungen; die Statistik zaehlt ohnehin nur noch "BOOKED", ein
// geloeschter Termin faellt also unabhaengig davon aus der Historie.
export async function deleteCalendarEvent(
  eventId: string,
  scope: EditScope,
): Promise<{ error?: string }> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;
  const { gymId } = await getCurrentEmployee();

  await withGymScope(gymId, async (db) => {
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId },
      select: { id: true, seriesId: true, startsAt: true },
    });
    if (!event) return;
    const where = scopeWhere(event, scope);
    const ids = where
      ? (await db.calendarEvent.findMany({ where, select: { id: true } })).map((r) => r.id)
      : [event.id];
    await db.booking.deleteMany({ where: { calendarEventId: { in: ids } } });
    await db.calendarEvent.deleteMany({ where: { id: { in: ids } } });
  });

  revalidatePath("/calendar");
  return {};
}

const UpdateEventSchema = z.object({
  scope: z.enum(["single", "following", "series"]),
  subjectType: z.enum(["course", "event"], { error: "Bitte Kurs oder Event wählen." }),
  subjectId: z.string().min(1, { error: "Bitte einen Kurs oder ein Event wählen." }),
  locationId: z.string().min(1, { error: "Bitte einen Standort wählen." }),
  // Nur bei scope "single" gesetzt/relevant - bei "following"/"series"
  // behaelt jeder betroffene Termin sein eigenes Datum, nur Uhrzeit/Dauer/
  // Kapazitaet/Kurs/Standort werden einheitlich uebernommen.
  date: z.coerce.date().optional(),
  startHour: z.coerce.number().int().min(0).max(23),
  durationMinutes: z.coerce.number().int().min(5).max(720),
  capacity: z.coerce.number().int().min(1),
});

export async function updateCalendarEvent(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;

  const validated = UpdateEventSchema.safeParse({
    scope: formData.get("scope"),
    subjectType: formData.get("subjectType"),
    subjectId: formData.get("subjectId"),
    locationId: formData.get("locationId"),
    date: formData.get("date") || undefined,
    startHour: formData.get("startHour"),
    durationMinutes: formData.get("durationMinutes"),
    capacity: formData.get("capacity"),
  });
  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  const { scope, subjectType, subjectId, locationId, date, startHour, durationMinutes, capacity } =
    validated.data;
  const { gymId } = await getCurrentEmployee();

  await withGymScope(gymId, async (db) => {
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId },
      select: { id: true, seriesId: true, startsAt: true },
    });
    if (!event) return;

    if (scope === "single") {
      if (!date) return;
      const startsAt = new Date(date);
      startsAt.setHours(startHour, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
      await db.calendarEvent.update({
        where: { id: eventId },
        data: { ...subjectField(subjectType, subjectId), locationId, startsAt, endsAt, capacity },
      });
      return;
    }

    const where = scopeWhere(event, scope);
    const targets = where
      ? await db.calendarEvent.findMany({ where, select: { id: true, startsAt: true } })
      : [{ id: event.id, startsAt: event.startsAt }];
    for (const target of targets) {
      const startsAt = new Date(target.startsAt);
      startsAt.setHours(startHour, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
      await db.calendarEvent.update({
        where: { id: target.id },
        data: { ...subjectField(subjectType, subjectId), locationId, startsAt, endsAt, capacity },
      });
    }
  });

  revalidatePath("/calendar");
}

export async function createCalendarEvent(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;

  const { gymId } = await getCurrentEmployee();
  const isWeekly = formData.get("mode") === "weekly";

  if (!isWeekly) {
    const validated = SingleEventSchema.safeParse({
      subjectType: formData.get("subjectType"),
      subjectId: formData.get("subjectId"),
      locationId: formData.get("locationId"),
      date: formData.get("date"),
      startHour: formData.get("startHour"),
      durationMinutes: formData.get("durationMinutes"),
      capacity: formData.get("capacity"),
    });
    if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

    const { subjectType, subjectId, locationId, date, startHour, durationMinutes, capacity } =
      validated.data;
    const startsAt = new Date(date);
    startsAt.setHours(startHour, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    await withGymScope(gymId, (db) =>
      db.calendarEvent.create({
        data: {
          ...subjectField(subjectType, subjectId),
          gymId,
          locationId,
          startsAt,
          endsAt,
          capacity,
        },
      }),
    );
    revalidatePath("/calendar");
    return;
  }

  const validated = WeeklyEventSchema.safeParse({
    subjectType: formData.get("subjectType"),
    subjectId: formData.get("subjectId"),
    locationId: formData.get("locationId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startHour: formData.get("startHour"),
    durationMinutes: formData.get("durationMinutes"),
    capacity: formData.get("capacity"),
    from: formData.get("from"),
    to: formData.get("noEndDate") === "on" ? null : formData.get("to"),
  });
  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  const {
    subjectType,
    subjectId,
    locationId,
    dayOfWeek,
    startHour,
    durationMinutes,
    capacity,
    from,
    to,
  } = validated.data;
  const effectiveTo = to ?? addYears(from, OPEN_ENDED_HORIZON_YEARS);

  const occurrences = getWeeklyOccurrences({ dayOfWeek, from, to: effectiveTo }).filter(
    (day) => !isGermanPublicHoliday(day),
  );
  if (occurrences.length === 0) {
    return {
      error: "Im gewählten Zeitraum liegen keine passenden Termine (ggf. nur Feiertage).",
    };
  }

  const seriesId = randomUUID();
  await withGymScope(gymId, (db) =>
    db.calendarEvent.createMany({
      data: occurrences.map((day) => {
        const startsAt = new Date(day);
        startsAt.setHours(startHour, 0, 0, 0);
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        return {
          ...subjectField(subjectType, subjectId),
          gymId,
          locationId,
          startsAt,
          endsAt,
          capacity,
          seriesId,
        };
      }),
    }),
  );

  revalidatePath("/calendar");
}

export async function cancelBooking(bookingId: string): Promise<{ error?: string }> {
  const permError = await checkPermission("permCalendar");
  if (permError) return permError;

  const { gymId } = await getCurrentEmployee();

  const notify = await withGymScope(gymId, async (db) => {
    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return null;

    return cancelBookingAndNotifyWaitlist(db, {
      id: booking.id,
      status: booking.status,
      calendarEventId: booking.calendarEventId,
      waitlistPosition: booking.waitlistPosition,
    });
  });

  if (notify) {
    await sendExpoPush(
      notify.expoPushToken,
      "Ein Platz ist frei geworden",
      "Jemand hat storniert - sichere dir jetzt deinen Platz in der App.",
      { calendarEventId: notify.calendarEventId, subjectType: notify.subjectType },
    );
  }

  revalidatePath("/calendar");
  return {};
}
