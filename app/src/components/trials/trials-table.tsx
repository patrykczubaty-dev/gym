"use client";

import { useMemo, useState } from "react";
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
import { DeleteTrialButton } from "@/components/trials/delete-trial-button";
import { cn } from "@/lib/utils";

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

const STATUS_FILTERS = ["ALLE", "OPEN", "PROPOSED", "ACCEPTED", "DECLINED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type ProposedSlot = {
  id: string;
  startsAt: Date;
  token: string;
  response: string;
  course: { title: string } | null;
};

type Trial = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  locationId: string;
  location: { city: string };
  message: string | null;
  status: string;
  proposedSlots: ProposedSlot[];
};

export function TrialsTable({
  trials,
  courses,
  locations,
}: {
  trials: Trial[];
  courses: { id: string; title: string }[];
  locations: { id: string; city: string }[];
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALLE");

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      ALLE: trials.length,
      OPEN: 0,
      PROPOSED: 0,
      ACCEPTED: 0,
      DECLINED: 0,
    };
    for (const t of trials) {
      counts[t.status as StatusFilter] = (counts[t.status as StatusFilter] ?? 0) + 1;
    }
    return counts;
  }, [trials]);

  const filtered = useMemo(() => {
    if (statusFilter === "ALLE") return trials;
    return trials.filter((t) => t.status === statusFilter);
  }, [trials, statusFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full border px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors",
              statusFilter === s
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "ALLE" ? "Alle" : STATUS_LABEL[s]} · {statusCounts[s]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vorname, Name</TableHead>
              <TableHead className="hidden md:table-cell">Am Standort</TableHead>
              <TableHead className="hidden lg:table-cell">Nachricht</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((trial) => (
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
                <TableCell className="flex justify-end gap-1">
                  <TrialCreateDialog trial={trial} locations={locations} />
                  <TrialProposeDialog
                    trialId={trial.id}
                    courses={courses}
                    existingSlots={trial.proposedSlots}
                  />
                  <DeleteTrialButton id={trial.id} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Keine Probetrainings gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
