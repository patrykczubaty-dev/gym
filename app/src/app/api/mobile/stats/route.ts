import { NextRequest, NextResponse } from "next/server";
import { startOfWeek, subWeeks, isSameMonth, getISOWeek } from "date-fns";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";

// Anzahl aufeinanderfolgender Kalenderwochen bis einschliesslich der
// aktuellen Woche, in denen mindestens eine Buchung liegt (vergangen oder
// bereits fuer die Woche geplant) - bricht ab, sobald eine Woche rueckwaerts
// keine Buchung hat. Bewusst simple Definition (kein "Gnadentag" wie bei
// manchen Habit-Trackern): die laufende Woche muss selbst schon eine
// Buchung haben, sonst zeigt der Streak 0 statt eines veralteten Werts.
function calculateWeekStreak(bookingStarts: Date[]): number {
  const weekStarts = new Set(bookingStarts.map((d) => startOfWeek(d, { weekStartsOn: 1 }).getTime()));
  let streak = 0;
  let cursor = startOfWeek(new Date(), { weekStartsOn: 1 });
  while (weekStarts.has(cursor.getTime())) {
    streak += 1;
    cursor = subWeeks(cursor, 1);
  }
  return streak;
}

// Zaehlt, wie oft sich der Kunde zu welchem Kurs angemeldet hat. Nur BOOKED
// (nicht CANCELLED/WAITLISTED) - eine spaeter stornierte Buchung ueberschreibt
// ihren Status, es gibt kein separates Anwesenheits-Tracking (siehe
// Abgrenzung in der Systeme-Seite), daher ist "aktuell/ehemals erfolgreich
// gebucht" die naechstbeste verfuegbare Kennzahl.
export async function GET(request: NextRequest) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const bookings = await withGymScope(customer.gymId, (db) =>
    db.booking.findMany({
      where: {
        customerId: customer.id,
        status: "BOOKED",
        calendarEvent: { courseId: { not: null } },
      },
      include: { calendarEvent: { include: { course: true, location: true } } },
    }),
  );

  const counts = new Map<string, number>();
  for (const booking of bookings) {
    const title = booking.calendarEvent.course!.title;
    counts.set(title, (counts.get(title) ?? 0) + 1);
  }

  const byCourse = [...counts.entries()]
    .map(([courseTitle, count]) => ({ courseTitle, count }))
    .sort((a, b) => b.count - a.count);

  const weekStreak = calculateWeekStreak(bookings.map((b) => b.calendarEvent.startsAt));

  const now = new Date();
  const monthlyCount = bookings.filter((b) => isSameMonth(b.calendarEvent.startsAt, now)).length;

  // Letzte 6 Kalenderwochen inkl. der laufenden, aelteste zuerst - fuer das
  // Balkendiagramm "Kurse pro Woche". Feste 6-Wochen-Fensterbreite statt
  // dynamisch seit Beitritt, damit der Chart nicht bei neuen Kunden leer
  // wirkt oder bei langjaehrigen Kunden unlesbar breit wird.
  const weekBuckets = Array.from({ length: 6 }, (_, i) => ({
    weekStart: startOfWeek(subWeeks(now, 5 - i), { weekStartsOn: 1 }),
    count: 0,
  }));
  for (const booking of bookings) {
    const bookingWeekStart = startOfWeek(booking.calendarEvent.startsAt, { weekStartsOn: 1 }).getTime();
    const bucket = weekBuckets.find((w) => w.weekStart.getTime() === bookingWeekStart);
    if (bucket) bucket.count += 1;
  }
  const weeklyBreakdown = weekBuckets.map((w) => ({
    weekLabel: `KW ${getISOWeek(w.weekStart)}`,
    count: w.count,
  }));

  // Bereits stattgefundene Termine, neueste zuerst - eigene, chronologische
  // Liste statt der aggregierten Werte oben (UI/UX-Entscheidung: vergangene
  // Kurse gehoeren in die Statistik, nicht auf die Startseite, siehe
  // Konversation). Auf die letzten 20 begrenzt, damit die Liste bei
  // langjaehrigen Kunden nicht unbegrenzt waechst.
  const recentVisits = bookings
    .filter((b) => b.calendarEvent.startsAt < now)
    .sort((a, b) => b.calendarEvent.startsAt.getTime() - a.calendarEvent.startsAt.getTime())
    .slice(0, 20)
    .map((b) => ({
      courseTitle: b.calendarEvent.course!.title,
      startsAt: b.calendarEvent.startsAt,
      location: b.calendarEvent.location.city,
    }));

  return NextResponse.json({
    totalBookings: bookings.length,
    byCourse,
    weekStreak,
    monthlyCount,
    weeklyBreakdown,
    recentVisits,
  });
}
