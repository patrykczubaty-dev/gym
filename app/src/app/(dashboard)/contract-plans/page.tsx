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
import { ContractPlanDialog } from "@/components/contract-plans/contract-plan-dialog";
import { DeleteContractPlanButton } from "@/components/contract-plans/delete-contract-plan-button";

export default async function ContractPlansPage() {
  const { gymId } = await getCurrentEmployee();
  const plans = await withGymScope(gymId, (db) =>
    db.contractPlan.findMany({ orderBy: { createdAt: "asc" } }),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Vertragsarten</h1>
        <ContractPlanDialog />
      </div>
      <p className="text-sm text-muted-foreground">
        Vertragsarten legen fest, wie viele Kurse ein Kunde pro Woche buchen darf. Eine Vertragsart
        ohne Limit (&bdquo;Flatrate&ldquo;) erlaubt unbegrenzte Kursbesuche.
      </p>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bezeichnung</TableHead>
              <TableHead className="hidden sm:table-cell">Kurse pro Woche</TableHead>
              <TableHead className="hidden lg:table-cell">Notizen</TableHead>
              <TableHead className="w-24 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="max-w-[9rem] font-medium whitespace-normal break-words sm:max-w-none">
                  <div>{plan.name}</div>
                  <div className="text-xs font-normal text-muted-foreground sm:hidden">
                    {plan.weeklyLimit === null ? "Flatrate" : `${plan.weeklyLimit}x / Woche`}
                  </div>
                </TableCell>
                <TableCell className="hidden font-mono sm:table-cell">
                  {plan.weeklyLimit === null ? "Flatrate" : `${plan.weeklyLimit}x / Woche`}
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {plan.notes ?? "—"}
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <ContractPlanDialog plan={plan} />
                  <DeleteContractPlanButton id={plan.id} />
                </TableCell>
              </TableRow>
            ))}
            {plans.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Keine Vertragsarten vorhanden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
