import { NextRequest, NextResponse } from "next/server";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";
import { canCancelBooking } from "@/lib/core/booking-cutoff";
import { sendExpoPush } from "@/lib/push";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const { id } = await params;

  const result = await withGymScope(customer.gymId, async (db) => {
    const booking = await db.booking.findUnique({
      where: { id },
      include: { calendarEvent: { include: { course: true } } },
    });

    if (!booking || booking.customerId !== customer.id || booking.status === "CANCELLED") {
      return { error: "Buchung nicht gefunden.", status: 404 } as const;
    }

    if (booking.status === "BOOKED") {
      const allowed = canCancelBooking(
        booking.calendarEvent.startsAt,
        booking.calendarEvent.course?.cancellationCutoffHours ?? null,
      );
      if (!allowed) {
        return {
          error:
            "Diese Buchung kann nicht mehr storniert werden (Stornofrist abgelaufen). Bitte wende dich ans Studio.",
          status: 400,
        } as const;
      }
    }

    await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });

    if (booking.status === "WAITLISTED" && booking.waitlistPosition !== null) {
      // Nachruecker auf der Warteliste ruecken auf, damit Positionen luecken-
      // los bleiben.
      await db.booking.updateMany({
        where: {
          calendarEventId: booking.calendarEventId,
          status: "WAITLISTED",
          waitlistPosition: { gt: booking.waitlistPosition },
        },
        data: { waitlistPosition: { decrement: 1 } },
      });
      return { promoted: null } as const;
    }

    // Ein BOOKED-Platz wurde frei - der Kunde ganz vorne auf der Warteliste
    // wird per Push informiert, muss den Platz aber selbst aktiv buchen
    // (bewusste Entscheidung, siehe Mobile-App-Quiz: kein Auto-Booking).
    const nextWaitlisted = await db.booking.findFirst({
      where: { calendarEventId: booking.calendarEventId, status: "WAITLISTED" },
      orderBy: { waitlistPosition: "asc" },
      include: { customer: true },
    });

    return { promoted: nextWaitlisted } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (result.promoted?.customer.expoPushToken) {
    await sendExpoPush(
      result.promoted.customer.expoPushToken,
      "Ein Platz ist frei geworden",
      "Jemand hat storniert - sichere dir jetzt deinen Platz in der App.",
    );
  }

  return NextResponse.json({ ok: true });
}
