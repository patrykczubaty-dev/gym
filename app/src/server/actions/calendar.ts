"use server";

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { addYears } from "date-fns";
import { revalidatePath } from "next/cache";
import { withGymScope } from "@/lib/scoped-prisma";
import { checkPermission } from "@/lib/permissions";
import { getCurrentEmployee } from "@/lib/dal";
import { resolveWaitlistPromotion } from "@/lib/core/waitlist";
import { getWeeklyOccurrences } from "@/lib/core/recurrence";
import { isGermanPublicHoliday } from "@/lib/core/holidays";

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
  capacity: z.coerce.number().int().min(1),
});

const WeeklyEventSchema = SubjectSchema.extend({
  locationId: z.string().min(1, { error: "Bitte einen Standort wählen." }),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startHour: z.coerce.number().int().min(0).max(23),
  capacity: z.coerce.number().int().min(1),
  from: z.coerce.date({ error: "Bitte ein Startdatum angeben." }),
  to: z.coerce.date().optional().nullable(),
});

function subjectField(subjectType: "course" | "event", subjectId: string) {
  return subjectType === "course" ? { courseId: subjectId } : { eventId: subjectId };
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
      capacity: formData.get("capacity"),
    });
    if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

    const { subjectType, subjectId, locationId, date, startHour, capacity } = validated.data;
    const startsAt = new Date(date);
    startsAt.setHours(startHour, 0, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setHours(startHour + 1, 0, 0, 0);

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
    capacity: formData.get("capacity"),
    from: formData.get("from"),
    to: formData.get("noEndDate") === "on" ? null : formData.get("to"),
  });
  if (!validated.success) return { error: "Bitte alle Pflichtfelder prüfen." };

  const { subjectType, subjectId, locationId, dayOfWeek, startHour, capacity, from, to } =
    validated.data;
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
        const endsAt = new Date(startsAt);
        endsAt.setHours(startHour + 1, 0, 0, 0);
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

  await withGymScope(gymId, async (db) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        calendarEvent: {
          include: {
            bookings: { where: { status: "WAITLISTED" } },
          },
        },
      },
    });

    if (!booking) return;

    if (booking.status === "WAITLISTED") {
      await db.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
      });
      return;
    }

    const { promoted, remaining } = resolveWaitlistPromotion(
      booking.calendarEvent.bookings
        .filter((b) => b.id !== bookingId)
        .map((b) => ({ id: b.id, waitlistPosition: b.waitlistPosition ?? 0 })),
      1,
    );

    await db.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
    for (const p of promoted) {
      await db.booking.update({
        where: { id: p.id },
        data: { status: "BOOKED", waitlistPosition: null },
      });
    }
    for (const r of remaining) {
      await db.booking.update({
        where: { id: r.id },
        data: { waitlistPosition: r.waitlistPosition },
      });
    }
  });

  revalidatePath("/calendar");
  return {};
}
