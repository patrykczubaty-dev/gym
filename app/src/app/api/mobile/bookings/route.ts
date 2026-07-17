import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";
import { getOccupancyStatus } from "@/lib/core/occupancy";

export async function GET(request: NextRequest) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const bookings = await withGymScope(customer.gymId, (db) =>
    db.booking.findMany({
      where: {
        customerId: customer.id,
        status: { in: ["BOOKED", "WAITLISTED"] },
        calendarEvent: { startsAt: { gte: new Date() } },
      },
      orderBy: { calendarEvent: { startsAt: "asc" } },
      include: { calendarEvent: { include: { course: true, location: true } } },
    }),
  );

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      waitlistPosition: b.waitlistPosition,
      calendarEventId: b.calendarEventId,
      course: b.calendarEvent.course
        ? { id: b.calendarEvent.course.id, title: b.calendarEvent.course.title }
        : null,
      location: { city: b.calendarEvent.location.city },
      startsAt: b.calendarEvent.startsAt,
      endsAt: b.calendarEvent.endsAt,
    })),
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
    const event = await db.calendarEvent.findUnique({
      where: { id: validated.data.calendarEventId },
      include: { bookings: { where: { status: { in: ["BOOKED", "WAITLISTED"] } } } },
    });
    if (!event) return { error: "Termin nicht gefunden.", status: 404 } as const;

    const alreadyBooked = event.bookings.find((b) => b.customerId === customer.id);
    if (alreadyBooked) {
      return { error: "Du bist für diesen Termin bereits gebucht.", status: 409 } as const;
    }

    const bookedCount = event.bookings.filter((b) => b.status === "BOOKED").length;
    const isFull = getOccupancyStatus(bookedCount, event.capacity) === "red";

    const waitlistCount = event.bookings.filter((b) => b.status === "WAITLISTED").length;

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
