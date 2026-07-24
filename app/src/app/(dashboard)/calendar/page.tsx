import Link from "next/link";
import { addDays, addWeeks, endOfWeek, format, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { withGymScope } from "@/lib/scoped-prisma";
import { getCurrentEmployee } from "@/lib/dal";
import { Badge } from "@/components/ui/badge";
import { EventDialog } from "@/components/calendar/event-dialog";
import { EventDetailsDialog } from "@/components/calendar/event-details-dialog";
import { getOccupancyStatus } from "@/lib/core/occupancy";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const OCCUPANCY_DOT: Record<string, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-destructive",
};

const OCCUPANCY_BAR: Record<string, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-destructive",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; week?: string }>;
}) {
  const { location, week } = await searchParams;
  const weekOffset = Number.parseInt(week ?? "0", 10) || 0;

  const weekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const rangeEnd = addDays(weekEnd, 1);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { gymId } = await getCurrentEmployee();
  const [events, courses, locations, settings] = await withGymScope(gymId, (db) =>
    Promise.all([
      db.calendarEvent.findMany({
        where: {
          startsAt: { gte: weekStart, lt: rangeEnd },
          ...(location ? { locationId: location } : {}),
        },
        orderBy: { startsAt: "asc" },
        include: {
          course: true,
          event: true,
          location: true,
          bookings: {
            where: { status: { in: ["BOOKED", "WAITLISTED"] } },
            include: { customer: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
      db.course.findMany({ orderBy: { title: "asc" } }),
      db.location.findMany({ orderBy: { city: "asc" } }),
      db.settings.upsert({ where: { gymId }, update: {}, create: { gymId } }),
    ]),
  );

  const eventsByDay = new Map<string, typeof events>();
  for (const event of events) {
    const key = format(event.startsAt, "yyyy-MM-dd");
    const list = eventsByDay.get(key) ?? [];
    list.push(event);
    eventsByDay.set(key, list);
  }

  const rangeLabel =
    format(weekStart, "MMMM", { locale: de }) === format(weekEnd, "MMMM", { locale: de })
      ? `${format(weekStart, "d.", { locale: de })}–${format(weekEnd, "d. MMMM yyyy", { locale: de })}`
      : `${format(weekStart, "d. MMMM", { locale: de })} – ${format(weekEnd, "d. MMMM yyyy", { locale: de })}`;

  function weekHref(offset: number) {
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (offset !== 0) params.set("week", String(offset));
    const qs = params.toString();
    return `/calendar${qs ? `?${qs}` : ""}`;
  }

  function locationHref(locationId?: string) {
    const params = new URLSearchParams();
    if (locationId) params.set("location", locationId);
    if (weekOffset !== 0) params.set("week", String(weekOffset));
    const qs = params.toString();
    return `/calendar${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Kalender</h1>
        <EventDialog
          courses={courses}
          locations={locations}
          defaultCourseDurationMinutes={settings.defaultCourseDurationMinutes}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={weekHref(weekOffset - 1)}
          className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          aria-label="Vorherige Woche"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="min-w-[14rem] text-center font-mono text-sm">{rangeLabel}</span>
        <Link
          href={weekHref(weekOffset + 1)}
          className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          aria-label="Nächste Woche"
        >
          <ChevronRight className="size-4" />
        </Link>
        {weekOffset !== 0 && (
          <Link
            href={weekHref(0)}
            className="rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            Heute
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={locationHref(undefined)}
          className={cn(
            "rounded-full border px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors",
            !location
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          Alle Standorte
        </Link>
        {locations.map((l) => (
          <Link
            key={l.id}
            href={locationHref(l.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors",
              location === l.id
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {l.city}
          </Link>
        ))}
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-success" /> Plätze frei
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-warning" /> fast voll
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive" /> voll / Warteliste
        </span>
      </div>

      <div className="space-y-4">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
          return (
            <div key={key} className="overflow-x-auto rounded-lg border bg-background">
              <div
                className={cn(
                  "flex items-center justify-between border-b px-4 py-2 text-sm font-medium",
                  isToday ? "bg-primary/10 text-primary" : "bg-muted/40",
                )}
              >
                <span>{format(day, "EEEE, d. MMMM", { locale: de })}</span>
                {isToday && <span className="font-mono text-xs">Heute</span>}
              </div>
              <div className="divide-y">
                {dayEvents.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">Keine Termine.</div>
                )}
                {dayEvents.map((event) => {
                  const title = event.course?.title ?? event.event?.title ?? "";
                  const booked = event.bookings.filter((b) => b.status === "BOOKED").length;
                  const occupancy = getOccupancyStatus(booked, event.capacity);
                  const waitlistCount = event.bookings.filter(
                    (b) => b.status === "WAITLISTED",
                  ).length;
                  const pct = Math.min(100, Math.round((booked / event.capacity) * 100));
                  return (
                    <EventDetailsDialog
                      key={event.id}
                      eventId={event.id}
                      seriesId={event.seriesId}
                      subjectType={event.courseId ? "course" : "event"}
                      subjectId={(event.courseId ?? event.eventId)!}
                      locationId={event.locationId}
                      courseTitle={title}
                      startsAt={event.startsAt}
                      endsAt={event.endsAt}
                      locationCity={event.location.city}
                      capacity={event.capacity}
                      occupancy={occupancy}
                      bookings={event.bookings}
                      courses={courses}
                      locations={locations}
                    >
                      <div className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn("size-2.5 rounded-full", OCCUPANCY_DOT[occupancy])}
                          />
                          <div>
                            <div className="flex items-center gap-1.5 font-medium">
                              {title}
                              {event.eventId && (
                                <Badge variant="outline" className="font-mono text-[10px]">
                                  Event
                                </Badge>
                              )}
                            </div>
                            <div className="font-mono text-sm text-muted-foreground">
                              {event.startsAt.toLocaleTimeString("de-DE", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              Uhr — {event.location.city}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {waitlistCount > 0 && (
                            <Badge variant="outline">{waitlistCount} Warteliste</Badge>
                          )}
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-mono text-sm text-muted-foreground">
                              {booked}/{event.capacity}
                            </span>
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn("h-full rounded-full", OCCUPANCY_BAR[occupancy])}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </EventDetailsDialog>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
