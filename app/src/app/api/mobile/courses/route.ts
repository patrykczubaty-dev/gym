import { NextRequest, NextResponse } from "next/server";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";
import { getOccupancyStatus } from "@/lib/core/occupancy";

const LOOKAHEAD_DAYS = 14;

export async function GET(request: NextRequest) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const now = new Date();
  const until = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

  const events = await withGymScope(customer.gymId, (db) =>
    db.calendarEvent.findMany({
      where: { courseId: { not: null }, startsAt: { gte: now, lte: until } },
      orderBy: { startsAt: "asc" },
      include: {
        course: { include: { leadTrainer: true } },
        location: true,
        bookings: { where: { status: { in: ["BOOKED", "WAITLISTED"] } } },
      },
    }),
  );

  const result = events.map((event) => {
    const bookedCount = event.bookings.filter((b) => b.status === "BOOKED").length;
    const ownBooking = event.bookings.find((b) => b.customerId === customer.id);
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
      occupancy: getOccupancyStatus(bookedCount, event.capacity),
      ownBookingStatus: ownBooking?.status ?? null,
      ownWaitlistPosition: ownBooking?.waitlistPosition ?? null,
    };
  });

  return NextResponse.json({ events: result });
}
