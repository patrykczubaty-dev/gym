import { NextRequest } from "next/server";
import { directPrisma } from "@/lib/prisma-direct";
import { withGymScope } from "@/lib/scoped-prisma";
import { getOccupancyStatus } from "@/lib/core/occupancy";

function page(title: string, message: string) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${title} — BEEPLUS</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: system-ui, sans-serif; background: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: white; border-radius: 12px; padding: 2rem; max-width: 28rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
  h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
  p { color: #52525b; }
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

function respond(status: number, title: string, message: string) {
  return new Response(page(title, message), {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const action = request.nextUrl.searchParams.get("action");

  // directPrisma: der Token ist der einzige Anhaltspunkt, die gymId des
  // zugehoerigen Trials ist per Definition noch nicht bekannt - dieser eine
  // Lookup muss RLS umgehen. Alles Weitere laeuft ueber withGymScope() mit
  // der so ermittelten gymId.
  const slot = await directPrisma.trialProposedSlot.findUnique({
    where: { token },
    include: { trial: true, course: true },
  });

  if (!slot) {
    return respond(404, "Link ungültig", "Dieser Terminvorschlag wurde nicht gefunden.");
  }

  const gymId = slot.trial.gymId;

  if (action === "decline") {
    await withGymScope(gymId, async (db) => {
      if (slot.response === "PENDING") {
        await db.trialProposedSlot.update({
          where: { id: slot.id },
          data: { response: "DECLINED", respondedAt: new Date() },
        });
      }

      const remainingPending = await db.trialProposedSlot.count({
        where: { trialId: slot.trialId, response: "PENDING" },
      });
      const anyAccepted = await db.trialProposedSlot.count({
        where: { trialId: slot.trialId, response: "ACCEPTED" },
      });
      if (remainingPending === 0 && anyAccepted === 0) {
        await db.trial.update({ where: { id: slot.trialId }, data: { status: "DECLINED" } });
      }
    });

    return respond(
      200,
      "Termin abgesagt",
      "Danke für deine Rückmeldung. Wir melden uns gerne telefonisch bei dir für einen alternativen Termin.",
    );
  }

  if (action === "accept") {
    const outcome = await withGymScope(gymId, async (db) => {
      const alreadyAccepted = await db.trialProposedSlot.findFirst({
        where: { trialId: slot.trialId, response: "ACCEPTED" },
      });

      if (alreadyAccepted && alreadyAccepted.id !== slot.id) {
        return "already-accepted" as const;
      }

      if (slot.response !== "ACCEPTED") {
        await db.trialProposedSlot.update({
          where: { id: slot.id },
          data: { response: "ACCEPTED", respondedAt: new Date() },
        });

        await db.trial.update({ where: { id: slot.trialId }, data: { status: "ACCEPTED" } });

        const existingCustomer = await db.customer.findFirst({
          where: { originTrialId: slot.trialId },
        });

        if (!existingCustomer) {
          const customer = await db.customer.create({
            data: {
              gymId,
              firstName: slot.trial.firstName,
              lastName: slot.trial.lastName,
              gender: "w",
              birthday: new Date(1990, 0, 1),
              email: slot.trial.email,
              phone: slot.trial.phone,
              status: "ACTIVE",
              contractType: "TRIAL",
              locations: { connect: [{ id: slot.trial.locationId }] },
              joinedAt: new Date(),
              originTrialId: slot.trialId,
            },
          });

          if (slot.courseId) {
            const dayStart = new Date(slot.startsAt);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);

            const calendarEvent = await db.calendarEvent.findFirst({
              where: { courseId: slot.courseId, startsAt: { gte: dayStart, lte: dayEnd } },
              include: { bookings: { where: { status: "BOOKED" } } },
            });

            if (calendarEvent) {
              const occupancy = getOccupancyStatus(
                calendarEvent.bookings.length,
                calendarEvent.capacity,
              );
              await db.booking.create({
                data: {
                  gymId,
                  calendarEventId: calendarEvent.id,
                  customerId: customer.id,
                  status: occupancy === "red" ? "WAITLISTED" : "BOOKED",
                  waitlistPosition:
                    occupancy === "red" ? calendarEvent.bookings.length + 1 : null,
                },
              });
            }
          }
        }
      }
      return "accepted" as const;
    });

    if (outcome === "already-accepted") {
      return respond(
        200,
        "Bereits angemeldet",
        "Du bist bereits für ein anderes Probetraining angemeldet.",
      );
    }

    return respond(
      200,
      "Zusage bestätigt",
      "Wir freuen uns auf dein Probetraining! Du erhältst bei Bedarf weitere Informationen vom Studio.",
    );
  }

  return respond(400, "Unbekannte Aktion", "Bitte nutze den Link aus deiner E-Mail.");
}
