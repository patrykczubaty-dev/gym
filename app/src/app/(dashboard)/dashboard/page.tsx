import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateDe } from "@/lib/dates";
import { Users, ClipboardList, Dumbbell, Newspaper, CalendarClock, FileWarning } from "lucide-react";

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

  const [
    activeCustomers,
    newActiveThisWeek,
    openTrials,
    newTrialsThisWeek,
    todaysBookings,
    yesterdaysBookings,
    recentNews,
    latestNews,
    upcomingEvents,
    soonCancellable,
  ] = await Promise.all([
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.customer.count({
      where: { status: "ACTIVE", joinedAt: { gte: weekAgo } },
    }),
    prisma.trial.count({ where: { status: { in: ["OPEN", "PROPOSED"] } } }),
    prisma.trial.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.booking.count({
      where: {
        status: "BOOKED",
        calendarEvent: { startsAt: { gte: todayStart, lte: todayEnd } },
      },
    }),
    prisma.booking.count({
      where: {
        status: "BOOKED",
        calendarEvent: { startsAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      },
    }),
    prisma.news.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.news.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.calendarEvent.findMany({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { course: true, event: true, location: true },
    }),
    prisma.contractDetail.findMany({
      where: {
        cancellationReceivedAt: null,
        cancellationPossibleUntil: { gte: now, lte: in30Days },
      },
      orderBy: { cancellationPossibleUntil: "asc" },
      take: 5,
      include: { customer: true },
    }),
  ]);

  const bookingsDelta = todaysBookings - yesterdaysBookings;

  const tiles = [
    {
      label: "Aktive Mitglieder",
      value: activeCustomers,
      icon: Users,
      href: "/customers",
      trend:
        newActiveThisWeek > 0
          ? { text: `+${newActiveThisWeek} diese Woche`, tone: "up" as const }
          : { text: "keine Neuzugänge diese Woche", tone: "flat" as const },
    },
    {
      label: "Angemeldete Probetrainings",
      value: openTrials,
      icon: ClipboardList,
      href: "/trials",
      trend:
        newTrialsThisWeek > 0
          ? { text: `+${newTrialsThisWeek} Anfragen diese Woche`, tone: "up" as const }
          : { text: "keine neuen Anfragen diese Woche", tone: "flat" as const },
    },
    {
      label: "Kursbesuche heute",
      value: todaysBookings,
      icon: Dumbbell,
      href: "/calendar",
      trend:
        bookingsDelta === 0
          ? { text: "wie gestern", tone: "flat" as const }
          : {
              text: `${bookingsDelta > 0 ? "+" : ""}${bookingsDelta} ggü. gestern`,
              tone: bookingsDelta > 0 ? ("up" as const) : ("down" as const),
            },
    },
    {
      label: "News (letzte 7 Tage)",
      value: recentNews,
      icon: Newspaper,
      href: "/news",
      trend: latestNews
        ? { text: `zuletzt am ${formatDateDe(latestNews.createdAt)}`, tone: "flat" as const }
        : { text: "noch keine News", tone: "flat" as const },
    },
  ];

  const trendColor = { up: "text-success", down: "text-destructive", flat: "text-muted-foreground" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Willkommen zurück im BEEPLUS-Backend.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href}>
            <Card className="relative gap-0 overflow-hidden py-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="hex-clip pointer-events-none absolute -top-4 -right-4 size-16 bg-primary opacity-[0.07]" />
              <CardContent className="relative p-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <tile.icon className="size-5" />
                </div>
                <div className="mt-3 font-mono text-2xl font-medium tabular-nums">
                  {tile.value}
                </div>
                <div className="text-sm text-muted-foreground">{tile.label}</div>
                <div className={`mt-2 font-mono text-xs ${trendColor[tile.trend.tone]}`}>
                  {tile.trend.text}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" />
              Nächste Kalendertermine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {upcomingEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">Keine anstehenden Termine.</p>
            )}
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <span className="font-medium">{event.course?.title ?? event.event?.title}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatDateDe(event.startsAt)},{" "}
                  {event.startsAt.toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  Uhr — {event.location.city}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileWarning className="size-4 text-primary" />
              Verträge bald kündbar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {soonCancellable.length === 0 && (
              <div className="flex flex-col items-start gap-2 py-1 text-sm text-muted-foreground">
                <span className="hex-clip size-7 border border-dashed border-border" />
                Keine Verträge mit Kündigungsfrist in den nächsten 30 Tagen.
              </div>
            )}
            {soonCancellable.map((contract) => (
              <Link
                key={contract.id}
                href={`/customers/${contract.customerId}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <span className="font-medium">
                  {contract.customer.firstName} {contract.customer.lastName}
                </span>
                <Badge variant="outline" className="font-mono">
                  bis {formatDateDe(contract.cancellationPossibleUntil)}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
