import { NextRequest, NextResponse } from "next/server";
import { subMonths, startOfWeek, endOfWeek } from "date-fns";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";
import { getOccupancyStatus } from "@/lib/core/occupancy";
import { canCancelBooking } from "@/lib/core/booking-cutoff";

// Kein manuelles Markieren - Favoriten werden aus der Buchungshistorie
// abgeleitet (Kurs mit >= MIN_BOOKINGS tatsaechlichen (nicht stornierten)
// Buchungen in den letzten HISTORY_MONTHS Monaten). Vermeidet Pflegeaufwand
// fuer den Kunden und passt sich automatisch an, wenn sich das
// Trainingsverhalten aendert (UI/UX-Entscheidung, siehe Konversation).
const HISTORY_MONTHS = 6;
const MIN_BOOKINGS = 2;
const MAX_FAVORITES = 4;
const LOOKAHEAD_DAYS = 14;

export async function GET(request: NextRequest) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const now = new Date();
  const since = subMonths(now, HISTORY_MONTHS);
  const until = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

  const [pastBookings, customerScope] = await withGymScope(customer.gymId, (db) =>
    Promise.all([
      db.booking.findMany({
        where: {
          customerId: customer.id,
          status: "BOOKED",
          calendarEvent: { startsAt: { gte: since, lte: now }, courseId: { not: null } },
        },
        include: { calendarEvent: { include: { course: true } } },
      }),
      db.customer.findUnique({
        where: { id: customer.id },
        include: { contract: { include: { plan: true } }, locations: { select: { id: true } } },
      }),
    ]),
  );

  const weeklyLimit = customerScope?.contract?.plan.weeklyLimit ?? null;

  const counts = new Map<string, { title: string; count: number }>();
  for (const booking of pastBookings) {
    const course = booking.calendarEvent.course;
    if (!course) continue;
    const entry = counts.get(course.id) ?? { title: course.title, count: 0 };
    entry.count += 1;
    counts.set(course.id, entry);
  }

  const topCourseIds = [...counts.entries()]
    .filter(([, v]) => v.count >= MIN_BOOKINGS)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, MAX_FAVORITES)
    .map(([courseId]) => courseId);

  if (topCourseIds.length === 0) {
    return NextResponse.json({ favorites: [] });
  }

  const allLocations = customerScope?.allLocations ?? false;
  const accessibleLocationIds = customerScope?.locations.map((l) => l.id) ?? [];

  // Nur der naechste anstehende Termin je Favoriten-Kurs (gleicher
  // Zwei-Wochen-Horizont wie /api/mobile/courses) - ein Favorit ist ein
  // Kurstyp, zum Buchen wird konkret der naechste Termin angeboten.
  const upcomingEvents = await withGymScope(customer.gymId, (db) =>
    db.calendarEvent.findMany({
      where: {
        courseId: { in: topCourseIds },
        startsAt: { gte: now, lte: until },
        ...(allLocations ? {} : { locationId: { in: accessibleLocationIds } }),
      },
      orderBy: { startsAt: "asc" },
      include: {
        course: { include: { leadTrainer: true } },
        location: true,
        bookings: { where: { status: { in: ["BOOKED", "WAITLISTED"] } } },
      },
    }),
  );

  // Kontingent der Kalenderwoche JEDES Termins einzeln (nicht die aktuelle
  // Woche) - Analog zu /api/mobile/courses, damit Favoriten auf der
  // Startseite denselben Kontingent-Ring zeigen wie die Kurse-Liste, statt
  // erst nach einem 409 beim Buchen davon zu erfahren.
  let weekUsageByWeekStart: Map<string, number> | null = null;
  if (weeklyLimit !== null) {
    const weekStarts = new Set(
      upcomingEvents.map((e) => startOfWeek(e.startsAt, { weekStartsOn: 1 }).toISOString()),
    );
    const weekCounts = await withGymScope(customer.gymId, (db) =>
      Promise.all(
        [...weekStarts].map(async (isoWeekStart) => {
          const weekStart = new Date(isoWeekStart);
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const count = await db.booking.count({
            where: {
              customerId: customer.id,
              // Wartelistenplaetze zaehlen wie Buchungen gegen das Kontingent
              // (siehe Absprache) - Events zaehlen nicht mit.
              status: { in: ["BOOKED", "WAITLISTED"] },
              calendarEvent: { startsAt: { gte: weekStart, lte: weekEnd }, courseId: { not: null } },
            },
          });
          return [isoWeekStart, count] as const;
        }),
      ),
    );
    weekUsageByWeekStart = new Map(weekCounts);
  }

  const favorites = topCourseIds.map((courseId) => {
    const courseTitle = counts.get(courseId)!.title;
    const nextEvent = upcomingEvents.find((e) => e.courseId === courseId);
    if (!nextEvent) {
      return { courseId, courseTitle, nextEvent: null };
    }

    const bookedCount = nextEvent.bookings.filter((b) => b.status === "BOOKED").length;
    const ownBooking = nextEvent.bookings.find((b) => b.customerId === customer.id);
    const occupancy = getOccupancyStatus(bookedCount, nextEvent.capacity);
    const isFull = occupancy === "red";
    const isoWeekStart = startOfWeek(nextEvent.startsAt, { weekStartsOn: 1 }).toISOString();
    const usedThisWeek = weekUsageByWeekStart?.get(isoWeekStart) ?? null;

    return {
      courseId,
      courseTitle,
      nextEvent: {
        id: nextEvent.id,
        startsAt: nextEvent.startsAt,
        endsAt: nextEvent.endsAt,
        trainer: nextEvent.course ? `${nextEvent.course.leadTrainer.firstName} ${nextEvent.course.leadTrainer.lastName}` : "",
        description: nextEvent.course?.description ?? null,
        location: { city: nextEvent.location.city },
        capacity: nextEvent.capacity,
        bookedCount,
        waitlistCount: nextEvent.bookings.filter((b) => b.status === "WAITLISTED").length,
        occupancy,
        ownBookingStatus: ownBooking?.status ?? null,
        ownBookingId: ownBooking?.id ?? null,
        canCancel:
          !ownBooking ||
          ownBooking.status !== "BOOKED" ||
          canCancelBooking(nextEvent.startsAt, nextEvent.course?.cancellationCutoffHours ?? null),
        isFull,
        weeklyQuota: weeklyLimit === null ? null : { limit: weeklyLimit, usedThisWeek: usedThisWeek! },
        cancellationCutoffHours: nextEvent.course?.cancellationCutoffHours ?? null,
      },
    };
  });

  return NextResponse.json({ favorites });
}
