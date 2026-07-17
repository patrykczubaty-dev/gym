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
import { CourseDialog } from "@/components/courses/course-dialog";
import { DeleteCourseButton } from "@/components/courses/delete-course-button";
import { getOccupancyStatus } from "@/lib/core/occupancy";
import { cn } from "@/lib/utils";

const OCCUPANCY_DOT: Record<string, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-destructive",
};

export default async function CoursesPage() {
  const { gymId } = await getCurrentEmployee();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [courses, employees, locations, todaysEvents] = await withGymScope(gymId, (db) =>
    Promise.all([
      db.course.findMany({
        orderBy: { title: "asc" },
        include: { leadTrainer: true, locations: true },
      }),
      db.employee.findMany({ orderBy: { lastName: "asc" } }),
      db.location.findMany({ orderBy: { city: "asc" } }),
      db.calendarEvent.findMany({
        where: { courseId: { not: null }, startsAt: { gte: todayStart, lte: todayEnd } },
        orderBy: { startsAt: "asc" },
        include: { bookings: { where: { status: "BOOKED" } } },
      }),
    ]),
  );

  // Bei mehreren heutigen Terminen desselben Kurses zaehlt der naechste
  // bevorstehende (erster Treffer, da nach startsAt sortiert).
  const todaysEventByCourseId = new Map<string, (typeof todaysEvents)[number]>();
  for (const event of todaysEvents) {
    if (event.courseId && !todaysEventByCourseId.has(event.courseId)) {
      todaysEventByCourseId.set(event.courseId, event);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Kurse</h1>
        <CourseDialog employees={employees} locations={locations} />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kursname</TableHead>
              <TableHead className="hidden sm:table-cell">Trainer</TableHead>
              <TableHead className="hidden md:table-cell">Max. Teilnehmer</TableHead>
              <TableHead className="hidden md:table-cell">Belegung heute</TableHead>
              <TableHead className="hidden lg:table-cell">Probetraining</TableHead>
              <TableHead className="hidden lg:table-cell">Standort</TableHead>
              <TableHead className="w-24 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => {
              const todaysEvent = todaysEventByCourseId.get(course.id);
              const booked = todaysEvent?.bookings.length ?? 0;
              const occupancy = todaysEvent
                ? getOccupancyStatus(booked, todaysEvent.capacity)
                : undefined;
              return (
                <TableRow key={course.id}>
                  <TableCell className="max-w-[9rem] font-medium whitespace-normal break-words sm:max-w-none">
                    <div>{course.title}</div>
                    {course.description && (
                      <div className="text-xs font-normal text-muted-foreground">
                        {course.description}
                      </div>
                    )}
                    <div className="text-xs font-normal text-muted-foreground sm:hidden">
                      {course.leadTrainer.firstName} {course.leadTrainer.lastName} ·{" "}
                      {course.locations.map((l) => l.city).join(", ")}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {course.leadTrainer.firstName} {course.leadTrainer.lastName}
                  </TableCell>
                  <TableCell className="hidden font-mono md:table-cell">
                    {course.participantLimit}
                  </TableCell>
                  <TableCell className="hidden font-mono md:table-cell">
                    {todaysEvent ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn("size-2 rounded-full", OCCUPANCY_DOT[occupancy!])}
                        />
                        {booked}/{todaysEvent.capacity}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">kein Termin heute</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {course.trialPossible ? "Ja" : "Nein"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {course.locations.map((l) => l.city).join(", ")}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <CourseDialog course={course} employees={employees} locations={locations} />
                    <DeleteCourseButton id={course.id} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
