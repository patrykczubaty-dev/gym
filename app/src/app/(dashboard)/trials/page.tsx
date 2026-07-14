import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { TrialCreateDialog } from "@/components/trials/trial-create-dialog";
import { TrialProposeDialog } from "@/components/trials/trial-propose-dialog";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Offen",
  PROPOSED: "Vorschlag versendet",
  ACCEPTED: "Zugesagt",
  DECLINED: "Abgelehnt",
};

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "success" | "destructive"> = {
  OPEN: "outline",
  PROPOSED: "secondary",
  ACCEPTED: "success",
  DECLINED: "destructive",
};

export default async function TrialsPage() {
  const [trials, courses, locations] = await Promise.all([
    prisma.trial.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        location: true,
        proposedSlots: { include: { course: true }, orderBy: { startsAt: "asc" } },
      },
    }),
    prisma.course.findMany({ where: { trialPossible: true }, orderBy: { title: "asc" } }),
    prisma.location.findMany({ orderBy: { city: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Probetrainings</h1>
        <TrialCreateDialog locations={locations} />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vorname, Name</TableHead>
              <TableHead className="hidden md:table-cell">Am Standort</TableHead>
              <TableHead className="hidden lg:table-cell">Nachricht</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16 text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trials.map((trial) => (
              <TableRow key={trial.id}>
                <TableCell className="max-w-[9rem] font-medium whitespace-normal break-words sm:max-w-none">
                  <div>
                    {trial.firstName} {trial.lastName}
                  </div>
                  <div className="text-xs font-normal break-all text-muted-foreground">
                    {[trial.phone, trial.email].filter(Boolean).join(" · ") || "—"}
                  </div>
                  <div className="text-xs font-normal text-muted-foreground md:hidden">
                    {trial.location.city}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{trial.location.city}</TableCell>
                <TableCell className="hidden max-w-xs truncate text-muted-foreground lg:table-cell">
                  {trial.message ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge variant={STATUS_VARIANT[trial.status]}>
                    {STATUS_LABEL[trial.status]}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-right">
                  <TrialProposeDialog
                    trialId={trial.id}
                    courses={courses}
                    existingSlots={trial.proposedSlots}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
