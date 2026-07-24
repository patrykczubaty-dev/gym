import { withGymScope } from "@/lib/scoped-prisma";
import { getCurrentEmployee } from "@/lib/dal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventDialog } from "@/components/events/event-dialog";
import { DeleteEventDialog } from "@/components/events/delete-event-dialog";
import { formatEventRange } from "@/lib/dates";

// Events sind bewusst 1:1 mit ihrem Kalendertermin (kein wiederkehrendes
// Event, siehe Absprache) - diese Seite listet deshalb echte Termine
// (CalendarEvent), nicht abstrakte Typen ohne Datum wie frueher. Anlegen/
// Bearbeiten/Loeschen inkl. Termin passiert komplett hier, nicht mehr ueber
// den Kalender (der zeigt Event-Termine nur noch lesend an).
export default async function EventsPage() {
  const { gymId } = await getCurrentEmployee();
  const [occurrences, locations] = await withGymScope(gymId, (db) =>
    Promise.all([
      db.calendarEvent.findMany({
        where: { eventId: { not: null } },
        orderBy: { startsAt: "asc" },
        include: {
          event: true,
          location: true,
          bookings: { where: { status: { in: ["BOOKED", "WAITLISTED"] } } },
        },
      }),
      db.location.findMany({ orderBy: { city: "asc" } }),
    ]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Events</h1>
        <EventDialog locations={locations} />
      </div>
      <p className="text-sm text-muted-foreground">
        Einmalige Veranstaltungen (z. B. Tag der offenen Tür, Wettkampf) — im Unterschied zu
        Kursen nicht wiederkehrend und nicht an einen Trainer gebunden.
      </p>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Bezeichnung</TableHead>
              <TableHead className="hidden sm:table-cell">Datum</TableHead>
              <TableHead className="hidden lg:table-cell">Standort</TableHead>
              <TableHead className="hidden md:table-cell">Belegung</TableHead>
              <TableHead className="w-24 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {occurrences.map((occurrence) => {
              const booked = occurrence.bookings.filter((b) => b.status === "BOOKED").length;
              return (
                <TableRow key={occurrence.id}>
                  <TableCell className="max-w-[9rem] font-medium whitespace-normal break-words sm:max-w-none">
                    <div>{occurrence.event!.title}</div>
                    {occurrence.event!.description && (
                      <div className="text-xs font-normal text-muted-foreground">
                        {occurrence.event!.description}
                      </div>
                    )}
                    <div className="text-xs font-normal text-muted-foreground sm:hidden">
                      {formatEventRange(occurrence.startsAt, occurrence.endsAt)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs whitespace-nowrap sm:table-cell">
                    {formatEventRange(occurrence.startsAt, occurrence.endsAt)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{occurrence.location.city}</TableCell>
                  <TableCell className="hidden font-mono md:table-cell">
                    {booked} / {occurrence.capacity}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <EventDialog
                      event={{
                        id: occurrence.event!.id,
                        calendarEventId: occurrence.id,
                        title: occurrence.event!.title,
                        description: occurrence.event!.description,
                        participantLimit: occurrence.capacity,
                        locationId: occurrence.locationId,
                        startsAt: occurrence.startsAt,
                        endsAt: occurrence.endsAt,
                      }}
                      locations={locations}
                    />
                    <DeleteEventDialog eventId={occurrence.event!.id} calendarEventId={occurrence.id} />
                  </TableCell>
                </TableRow>
              );
            })}
            {occurrences.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Keine Events vorhanden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
