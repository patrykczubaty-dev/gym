import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startOfWeek, endOfWeek } from "date-fns";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";
import { getOccupancyStatus } from "@/lib/core/occupancy";
import { isWithinWeeklyLimit } from "@/lib/core/weekly-limit";
import { canCancelBooking } from "@/lib/core/booking-cutoff";

export async function GET(request: NextRequest) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  // Ab Wochenbeginn statt ab "jetzt" - ein bereits stattgefundener Termin
  // von frueher in dieser Woche zaehlt weiterhin gegen das Wochenkontingent
  // (siehe weiter unten), soll der App aber auch sichtbar sein, statt
  // kommentarlos zu verschwinden (UI/UX: "wieso sehe ich den 2. Kurs nicht,
  // obwohl 2/2 Kontingent verbraucht sind"). Das Frontend markiert
  // vergangene Termine separat als "Bereits besucht" statt sie stornierbar
  // anzuzeigen.
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const [bookings, weeklyLimit] = await withGymScope(customer.gymId, (db) =>
    Promise.all([
      db.booking.findMany({
        where: {
          customerId: customer.id,
          status: { in: ["BOOKED", "WAITLISTED"] },
          calendarEvent: { startsAt: { gte: currentWeekStart } },
        },
        orderBy: { calendarEvent: { startsAt: "asc" } },
        include: {
          calendarEvent: {
            include: {
              course: { include: { leadTrainer: true } },
              event: true,
              location: true,
              bookings: { where: { status: { in: ["BOOKED", "WAITLISTED"] } } },
            },
          },
        },
      }),
      // Fuer die aktivitaets-abhaengige Begruessung auf der Startseite
      // (voll gebucht diese Woche vs. noch nichts gebucht).
      db.customer
        .findUnique({ where: { id: customer.id }, include: { contract: { include: { plan: true } } } })
        .then((c) => c?.contract?.plan.weeklyLimit ?? null),
    ]),
  );

  return NextResponse.json({
    weeklyLimit,
    bookings: bookings.map((b) => {
      const bookedCount = b.calendarEvent.bookings.filter((x) => x.status === "BOOKED").length;
      return {
        id: b.id,
        status: b.status,
        waitlistPosition: b.waitlistPosition,
        calendarEventId: b.calendarEventId,
        course: b.calendarEvent.course
          ? {
              id: b.calendarEvent.course.id,
              title: b.calendarEvent.course.title,
              description: b.calendarEvent.course.description,
              trainer: `${b.calendarEvent.course.leadTrainer.firstName} ${b.calendarEvent.course.leadTrainer.lastName}`,
            }
          : null,
        // Events (z.B. "Tag der offenen Tuer") haben keinen Kurs - ohne dieses
        // Feld fiel die App auf den generischen "Termin"-Platzhalter zurueck,
        // obwohl der echte Titel laengst geladen war (nur nicht mitgegeben).
        event: b.calendarEvent.event
          ? { title: b.calendarEvent.event.title, description: b.calendarEvent.event.description }
          : null,
        location: { city: b.calendarEvent.location.city },
        startsAt: b.calendarEvent.startsAt,
        endsAt: b.calendarEvent.endsAt,
        // Nur fuer BOOKED relevant (Warteliste hat keine Stornofrist) - so kann
        // die App den Stornieren-Button vorab deaktivieren statt den Nutzer
        // erst nach dem Tippen scheitern zu lassen (UI/UX-Review, Punkt 2).
        canCancel:
          b.status !== "BOOKED" ||
          canCancelBooking(b.calendarEvent.startsAt, b.calendarEvent.course?.cancellationCutoffHours ?? null),
        cancellationCutoffHours: b.calendarEvent.course?.cancellationCutoffHours ?? null,
        // Fuer den Belegungsbalken, der jetzt einheitlich auf allen Karten
        // (Kurse-/Events-/Statistik-Tab UND Start-Tab) angezeigt wird, siehe
        // Absprache.
        capacity: b.calendarEvent.capacity,
        bookedCount,
        waitlistCount: b.calendarEvent.bookings.filter((x) => x.status === "WAITLISTED").length,
        occupancy: getOccupancyStatus(bookedCount, b.calendarEvent.capacity),
      };
    }),
  });
}

const CreateSchema = z.object({ calendarEventId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validated = CreateSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const result = await withGymScope(customer.gymId, async (db) => {
    // Serverseitige Durchsetzung der Standort-Zuordnung, nicht nur
    // Ausblenden in der Kursliste - sonst waere die Sichtbarkeits-
    // Einschraenkung ueber einen direkten API-Aufruf mit bekannter
    // calendarEventId umgehbar. Der Vertragsstatus (nur "ACTIVE" darf
    // ueberhaupt bis hierher kommen) wird bereits zentral in
    // getMobileCustomer() geprueft, siehe lib/mobile-auth.ts.
    const customerScope = await db.customer.findUnique({
      where: { id: customer.id },
      select: { allLocations: true, locations: { select: { id: true } } },
    });

    const event = await db.calendarEvent.findUnique({
      where: { id: validated.data.calendarEventId },
      include: {
        bookings: { where: { status: { in: ["BOOKED", "WAITLISTED"] } } },
        course: { select: { waitlistLimit: true } },
      },
    });
    if (!event) return { error: "Termin nicht gefunden.", status: 404 } as const;

    const hasLocationAccess =
      customerScope?.allLocations || customerScope?.locations.some((l) => l.id === event.locationId);
    if (!hasLocationAccess) {
      return {
        error: "Dieser Termin liegt an einem Standort, dem du nicht zugeordnet bist.",
        status: 403,
      } as const;
    }

    const alreadyBooked = event.bookings.find((b) => b.customerId === customer.id);
    if (alreadyBooked) {
      return { error: "Du bist für diesen Termin bereits gebucht.", status: 409 } as const;
    }

    const bookedCount = event.bookings.filter((b) => b.status === "BOOKED").length;
    const isFull = getOccupancyStatus(bookedCount, event.capacity) === "red";

    // Das Wochenlimit zaehlt Buchungen UND Wartelistenplaetze zusammen (nicht
    // nur echte Buchungen, siehe Absprache): bei Limit 2 sind nur noch "2
    // gebucht", "1 gebucht + 1 Warteliste" oder "2 Wartelisten" moeglich -
    // ein Wartelistenplatz ist genauso ein aktiver Anspruch wie eine
    // Buchung und soll das Kontingent deshalb genauso ausschoepfen. Events
    // zaehlen nicht gegen das Kurs-Wochenkontingent (siehe Absprache) - die
    // Pruefung entfaellt fuer sie komplett, nicht nur die Zaehlung.
    const plan =
      event.courseId === null
        ? null
        : await db.customer
            .findUnique({ where: { id: customer.id }, include: { contract: { include: { plan: true } } } })
            .then((c) => c?.contract?.plan ?? null);

    if (plan) {
      const weekStart = startOfWeek(event.startsAt, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(event.startsAt, { weekStartsOn: 1 });
      const usedThisWeek = await db.booking.count({
        where: {
          customerId: customer.id,
          status: { in: ["BOOKED", "WAITLISTED"] },
          // Events (z.B. "Tag der offenen Tuer") zaehlen nicht gegen das
          // Kurs-Wochenkontingent - nur echte Kursbuchungen/-wartelisten.
          calendarEvent: { startsAt: { gte: weekStart, lte: weekEnd }, courseId: { not: null } },
        },
      });
      if (!isWithinWeeklyLimit(usedThisWeek, plan.weeklyLimit)) {
        return {
          error: `Dein Vertrag erlaubt ${plan.weeklyLimit}x Buchungen pro Woche (Wartelistenplätze zählen mit) - dieses Limit ist für diese Woche bereits erreicht.`,
          status: 409,
        } as const;
      }
    }

    const waitlistCount = event.bookings.filter((b) => b.status === "WAITLISTED").length;

    if (isFull) {
      const settings = await db.settings.findUnique({
        where: { gymId: customer.gymId },
        select: { defaultWaitlistLimit: true },
      });
      const effectiveLimit = event.course?.waitlistLimit ?? settings?.defaultWaitlistLimit ?? null;
      if (effectiveLimit !== null && waitlistCount >= effectiveLimit) {
        return { error: "Die Warteliste für diesen Termin ist voll.", status: 409 } as const;
      }
    }

    const booking = await db.booking.create({
      data: {
        gymId: customer.gymId,
        calendarEventId: event.id,
        customerId: customer.id,
        status: isFull ? "WAITLISTED" : "BOOKED",
        waitlistPosition: isFull ? waitlistCount + 1 : null,
      },
    });

    return { booking } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ booking: result.booking }, { status: 201 });
}
