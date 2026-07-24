import "server-only";
import type { ScopedPrisma } from "@/lib/scoped-prisma";

type CancelledBooking = {
  id: string;
  status: string;
  calendarEventId: string;
  waitlistPosition: number | null;
};

export type WaitlistNotifyTarget = {
  expoPushToken: string;
  calendarEventId: string;
  subjectType: "course" | "event";
} | null;

// Einheitliche Stornierungs-Nachbehandlung fuer Admin-Dashboard UND
// Mobile-App (vorher zwei divergierende Implementierungen mit
// unterschiedlichem Verhalten, siehe Absprache):
// - War die Buchung selbst auf der Warteliste, ruecken die nachfolgenden
//   Positionen luecken-los nach.
// - War die Buchung BOOKED, wird KEIN Wartelisten-Kunde automatisch auf
//   BOOKED gesetzt (bewusst kein Auto-Booking). Stattdessen wird der Kunde
//   ganz vorne auf der Warteliste ermittelt und als Push-Ziel zurueckgegeben
//   (der eigentliche Versand passiert bewusst AUSSERHALB der DB-Transaktion,
//   siehe Aufrufer) - er muss sich selbst aktiv einbuchen (Quota wird dabei
//   erneut geprueft), first come first served ueber die normale atomare
//   Buchungspruefung.
export async function cancelBookingAndNotifyWaitlist(
  db: ScopedPrisma,
  booking: CancelledBooking,
): Promise<WaitlistNotifyTarget> {
  await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });

  if (booking.status === "WAITLISTED") {
    if (booking.waitlistPosition !== null) {
      await db.booking.updateMany({
        where: {
          calendarEventId: booking.calendarEventId,
          status: "WAITLISTED",
          waitlistPosition: { gt: booking.waitlistPosition },
        },
        data: { waitlistPosition: { decrement: 1 } },
      });
    }
    return null;
  }

  const nextWaitlisted = await db.booking.findFirst({
    where: { calendarEventId: booking.calendarEventId, status: "WAITLISTED" },
    orderBy: { waitlistPosition: "asc" },
    include: { customer: true, calendarEvent: { select: { courseId: true } } },
  });

  if (!nextWaitlisted?.customer.expoPushToken) return null;
  return {
    expoPushToken: nextWaitlisted.customer.expoPushToken,
    calendarEventId: booking.calendarEventId,
    subjectType: nextWaitlisted.calendarEvent.courseId ? "course" : "event",
  };
}
