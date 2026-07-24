import { NextRequest, NextResponse } from "next/server";
import { startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";
import { getOccupancyStatus } from "@/lib/core/occupancy";
import { canCancelBooking } from "@/lib/core/booking-cutoff";

export async function GET(request: NextRequest) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const now = new Date();
  // Rest der aktuellen Woche + komplette naechste Woche (Mo-So), nicht
  // mehr ein rollierendes 14-Tage-Fenster - so lassen sich die beiden
  // Wochen-Tabs in der App sauber ohne Ueberschneidung abbilden.
  const until = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

  // Standort-Zugehoerigkeit vorab laden: bestimmt, welche Termine ueberhaupt
  // sichtbar sind (nicht nur, welche Filter-Chips angezeigt werden) - ein
  // Mitglied soll keine Kurse an Standorten sehen, denen es nicht zugeordnet
  // ist. allLocations=true schliesst auch kuenftig neu angelegte Standorte
  // automatisch mit ein.
  const customerScope = await withGymScope(customer.gymId, (db) =>
    db.customer.findUnique({
      where: { id: customer.id },
      include: {
        contract: { include: { plan: true } },
        locations: { select: { id: true } },
      },
    }),
  );
  const weeklyLimit = customerScope?.contract?.plan.weeklyLimit ?? null;
  const allLocations = customerScope?.allLocations ?? false;
  const accessibleLocationIds = customerScope?.locations.map((l) => l.id) ?? [];

  const [events, gymLocations] = await withGymScope(customer.gymId, (db) =>
    Promise.all([
      db.calendarEvent.findMany({
        where: {
          courseId: { not: null },
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
      // Alle Standorte des Gyms, gefiltert auf die zugeordneten - ein
      // Standort-Filter soll nicht verschwinden, nur weil dort gerade
      // zufaellig kein Kurs in den naechsten zwei Wochen stattfindet.
      db.location.findMany({ select: { id: true, city: true }, orderBy: { city: "asc" } }),
    ]),
  );
  const locations = allLocations
    ? gymLocations
    : gymLocations.filter((l) => accessibleLocationIds.includes(l.id));

  // Der 14-Tage-Vorschauzeitraum kann mehrere Kalenderwochen ueberspannen -
  // ein einzelnes globales "Kontingent diese Woche" waere fuer Termine in
  // einer anderen Woche irrefuehrend. Deshalb pro anwesender Woche einzeln
  // zaehlen und jedem Termin die Zahlen SEINER eigenen Woche mitgeben.
  let weekUsageByWeekStart: Map<string, number> | null = null;
  if (weeklyLimit !== null) {
    const weekStarts = new Set(
      events.map((e) => startOfWeek(e.startsAt, { weekStartsOn: 1 }).toISOString()),
    );
    const counts = await withGymScope(customer.gymId, (db) =>
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
    weekUsageByWeekStart = new Map(counts);
  }

  const result = events.map((event) => {
    const bookedCount = event.bookings.filter((b) => b.status === "BOOKED").length;
    const ownBooking = event.bookings.find((b) => b.customerId === customer.id);
    const isoWeekStart = startOfWeek(event.startsAt, { weekStartsOn: 1 }).toISOString();
    const usedThisWeek = weekUsageByWeekStart?.get(isoWeekStart) ?? null;
    return {
      id: event.id,
      course: {
        id: event.course!.id,
        title: event.course!.title,
        description: event.course!.description,
        trainer: `${event.course!.leadTrainer.firstName} ${event.course!.leadTrainer.lastName}`,
      },
      location: { city: event.location.city },
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      capacity: event.capacity,
      bookedCount,
      waitlistCount: event.bookings.filter((b) => b.status === "WAITLISTED").length,
      occupancy: getOccupancyStatus(bookedCount, event.capacity),
      ownBookingStatus: ownBooking?.status ?? null,
      ownWaitlistPosition: ownBooking?.waitlistPosition ?? null,
      // Erlaubt der App, direkt von der Kurskarte aus zu stornieren, ohne
      // erst in den Buchungen-Tab wechseln zu muessen (UX-Feedback: Fitts's
      // Law, kuerzester Weg zur naechsten Aktion). Warteliste hat keine
      // Stornofrist, nur BOOKED wird geprueft.
      ownBookingId: ownBooking?.id ?? null,
      canCancel:
        !ownBooking ||
        ownBooking.status !== "BOOKED" ||
        canCancelBooking(event.startsAt, event.course?.cancellationCutoffHours ?? null),
      cancellationCutoffHours: event.course?.cancellationCutoffHours ?? null,
      // Kontingent der Kalenderwoche, in der DIESER Termin liegt (nicht die
      // aktuelle Woche - UI/UX-Review Punkt 3, siehe Kommentar oben). null =
      // Flatrate, kein Limit anzuzeigen.
      weeklyQuota: weeklyLimit === null ? null : { limit: weeklyLimit, usedThisWeek: usedThisWeek! },
    };
  });

  return NextResponse.json({
    events: result,
    locations: [...new Set(locations.map((l) => l.city))],
  });
}
