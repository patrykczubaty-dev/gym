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
import { EventTypeDialog } from "@/components/events/event-type-dialog";
import { DeleteEventButton } from "@/components/events/delete-event-button";

export default async function EventsPage() {
  const { gymId } = await getCurrentEmployee();
  const [events, locations] = await withGymScope(gymId, (db) =>
    Promise.all([
      db.event.findMany({
        orderBy: { title: "asc" },
        include: { locations: true },
      }),
      db.location.findMany({ orderBy: { city: "asc" } }),
    ]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Events</h1>
        <EventTypeDialog locations={locations} />
      </div>
      <p className="text-sm text-muted-foreground">
        Einmalige Veranstaltungen (z. B. Tag der offenen Tür, Wettkampf) — im Unterschied zu
        Kursen nicht wiederkehrend und nicht an einen Trainer gebunden. Events lassen sich wie
        Kurse im Kalender terminieren.
      </p>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Bezeichnung</TableHead>
              <TableHead className="hidden md:table-cell">Teilnehmerzahl</TableHead>
              <TableHead className="hidden lg:table-cell">Standort</TableHead>
              <TableHead className="w-24 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="max-w-[9rem] font-medium whitespace-normal break-words sm:max-w-none">
                  <div>{event.title}</div>
                  {event.description && (
                    <div className="text-xs font-normal text-muted-foreground">
                      {event.description}
                    </div>
                  )}
                  <div className="text-xs font-normal text-muted-foreground md:hidden">
                    {event.participantLimit} Plätze ·{" "}
                    {event.locations.map((l) => l.city).join(", ")}
                  </div>
                </TableCell>
                <TableCell className="hidden font-mono md:table-cell">
                  {event.participantLimit}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {event.locations.map((l) => l.city).join(", ")}
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <EventTypeDialog event={event} locations={locations} />
                  <DeleteEventButton id={event.id} />
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
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
