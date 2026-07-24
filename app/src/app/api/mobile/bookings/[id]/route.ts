import { NextRequest, NextResponse } from "next/server";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";
import { canCancelBooking } from "@/lib/core/booking-cutoff";
import { sendExpoPush } from "@/lib/push";
import { cancelBookingAndNotifyWaitlist } from "@/server/booking-cancellation";

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

    const notify = await cancelBookingAndNotifyWaitlist(db, {
      id: booking.id,
      status: booking.status,
      calendarEventId: booking.calendarEventId,
      waitlistPosition: booking.waitlistPosition,
    });

    return { notify } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (result.notify) {
    await sendExpoPush(
      result.notify.expoPushToken,
      "Ein Platz ist frei geworden",
      "Jemand hat storniert - sichere dir jetzt deinen Platz in der App.",
      { calendarEventId: result.notify.calendarEventId, subjectType: result.notify.subjectType },
    );
  }

  return NextResponse.json({ ok: true });
}
