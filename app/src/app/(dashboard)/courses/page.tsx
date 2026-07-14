import { prisma } from "@/lib/prisma";
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

export default async function CoursesPage() {
  const [courses, employees, locations] = await Promise.all([
    prisma.course.findMany({
      orderBy: { title: "asc" },
      include: { leadTrainer: true, locations: true },
    }),
    prisma.employee.findMany({ orderBy: { lastName: "asc" } }),
    prisma.location.findMany({ orderBy: { city: "asc" } }),
  ]);

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
              <TableHead className="hidden md:table-cell">Teilnehmer Limit</TableHead>
              <TableHead className="hidden lg:table-cell">Probetraining</TableHead>
              <TableHead className="hidden lg:table-cell">Standort</TableHead>
              <TableHead className="w-24 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
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
                <TableCell className="hidden font-mono md:table-cell">{course.participantLimit}</TableCell>
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
