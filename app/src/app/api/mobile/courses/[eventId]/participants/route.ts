import { NextRequest, NextResponse } from "next/server";
import { getMobileCustomer } from "@/lib/mobile-auth";
import { withGymScope } from "@/lib/scoped-prisma";

// Vorname + Nachname-Initiale statt vollem Namen (siehe Datenschutz-
// Abwaegung: Mitglieder duerfen sehen, wer im selben Kurs ist, aber keine
// vollen Namen fremder Personen einsehen koennen, die sie sonst nicht haetten).
function displayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName.charAt(0)}.`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const customer = await getMobileCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const { eventId } = await params;

  const event = await withGymScope(customer.gymId, (db) =>
    db.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        bookings: {
          where: { status: { in: ["BOOKED", "WAITLISTED"] } },
          orderBy: [{ status: "asc" }, { waitlistPosition: "asc" }],
          include: { customer: true },
        },
      },
    }),
  );

  if (!event) {
    return NextResponse.json({ error: "Termin nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({
    booked: event.bookings
      .filter((b) => b.status === "BOOKED")
      .map((b) => ({
        name: displayName(b.customer.firstName, b.customer.lastName),
        isMe: b.customerId === customer.id,
      })),
    waitlisted: event.bookings
      .filter((b) => b.status === "WAITLISTED")
      .map((b) => ({
        name: displayName(b.customer.firstName, b.customer.lastName),
        isMe: b.customerId === customer.id,
        position: b.waitlistPosition,
      })),
  });
}
