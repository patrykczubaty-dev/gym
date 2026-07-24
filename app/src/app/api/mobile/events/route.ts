import { NextRequest, NextResponse } from "next/server";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";
import { getOccupancyStatus } from "@/lib/core/occupancy";

// Spiegelt /api/mobile/courses, aber fuer Event-Kalendertermine (Tag der
// offenen Tuer, Wettkampf etc. - siehe Event-Model, bewusst getrennt von
// Course: kein Trainer, kein Probetraining). Buchen/Stornieren laeuft ueber
// dieselben /api/mobile/bookings-Routen, da Booking.calendarEventId
// unabhaengig davon ist, ob der Termin zu einem Course oder Event gehoert.
//
// Bewusst KEIN Lookahead-Limit (anders als bei Kursen): Events sind
// Einzeltermine ohne Wochenkontingent-Bezug, es gibt also keinen Grund, weit
// in der Zukunft liegende Termine (z.B. eine Jahresfeier) auszublenden - die
// App soll alle kommenden Events zeigen, egal wie weit weg (Absprache).
export async function GET(request: NextRequest) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const now = new Date();

  // Nur Termine an Standorten zeigen, denen der Kunde zugeordnet ist (siehe
  // gleiche Logik in /api/mobile/courses).
  const customerScope = await withGymScope(customer.gymId, (db) =>
    db.customer.findUnique({ where: { id: customer.id }, include: { locations: { select: { id: true } } } }),
  );
  const allLocations = customerScope?.allLocations ?? false;
  const accessibleLocationIds = customerScope?.locations.map((l) => l.id) ?? [];

  const events = await withGymScope(customer.gymId, (db) =>
    db.calendarEvent.findMany({
      where: {
        eventId: { not: null },
        startsAt: { gte: now },
        ...(allLocations ? {} : { locationId: { in: accessibleLocationIds } }),
      },
      orderBy: { startsAt: "asc" },
      include: {
        event: true,
        location: true,
        bookings: { where: { status: { in: ["BOOKED", "WAITLISTED"] } } },
      },
    }),
  );

  const result = events.map((calendarEvent) => {
    const bookedCount = calendarEvent.bookings.filter((b) => b.status === "BOOKED").length;
    const ownBooking = calendarEvent.bookings.find((b) => b.customerId === customer.id);
    return {
      id: calendarEvent.id,
      title: calendarEvent.event!.title,
      description: calendarEvent.event!.description,
      location: { city: calendarEvent.location.city },
      startsAt: calendarEvent.startsAt,
      endsAt: calendarEvent.endsAt,
      capacity: calendarEvent.capacity,
      bookedCount,
      waitlistCount: calendarEvent.bookings.filter((b) => b.status === "WAITLISTED").length,
      occupancy: getOccupancyStatus(bookedCount, calendarEvent.capacity),
      ownBookingStatus: ownBooking?.status ?? null,
      ownWaitlistPosition: ownBooking?.waitlistPosition ?? null,
      ownBookingId: ownBooking?.id ?? null,
      // Event hat (anders als Course) kein cancellationCutoffHours-Feld im
      // Datenmodell - Stornierung ist hier immer uneingeschraenkt moeglich.
      canCancel: true,
      cancellationCutoffHours: null,
    };
  });

  return NextResponse.json({ events: result });
}
