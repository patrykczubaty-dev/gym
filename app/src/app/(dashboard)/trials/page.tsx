import { withGymScope } from "@/lib/scoped-prisma";
import { getCurrentEmployee } from "@/lib/dal";
import { TrialCreateDialog } from "@/components/trials/trial-create-dialog";
import { TrialsTable } from "@/components/trials/trials-table";

export default async function TrialsPage() {
  const { gymId } = await getCurrentEmployee();
  const [trials, courses, locations] = await withGymScope(gymId, (db) =>
    Promise.all([
      db.trial.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          location: true,
          proposedSlots: { include: { course: true }, orderBy: { startsAt: "asc" } },
        },
      }),
      db.course.findMany({ where: { trialPossible: true }, orderBy: { title: "asc" } }),
      db.location.findMany({ orderBy: { city: "asc" } }),
    ]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Probetrainings</h1>
        <TrialCreateDialog locations={locations} />
      </div>

      <TrialsTable trials={trials} courses={courses} locations={locations} />
    </div>
  );
}
