import Link from "next/link";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateDe } from "@/lib/dates";
import { formatCents } from "@/lib/money";

export default async function SepaPage() {
  const { gymId } = await getCurrentEmployee();
  const debits = await withGymScope(gymId, (db) =>
    db.sepaDebit.findMany({
      orderBy: { bookingDate: "desc" },
      include: { customer: { select: { id: true, firstName: true, lastName: true } } },
    }),
  );

  const openCents = debits
    .filter((d) => d.status === "OPEN")
    .reduce((sum, d) => sum + d.amountCents, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">SEPA-Zahlungseinzug</h1>
      <p className="text-sm text-muted-foreground">
        Sammelübersicht aller SEPA-Lastschriften. Offener Gesamtbetrag: {formatCents(openCents)}.
        Der tatsächliche Einzugsdatei-Export an die Bank ist in diesem ersten Entwurf noch nicht
        angebunden.
      </p>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kunde</TableHead>
              <TableHead>Betrag</TableHead>
              <TableHead className="hidden sm:table-cell">Buchungsdatum</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debits.map((debit) => (
              <TableRow key={debit.id}>
                <TableCell className="whitespace-normal">
                  <Link href={`/customers/${debit.customer.id}`} className="hover:underline">
                    {debit.customer.firstName} {debit.customer.lastName}
                  </Link>
                  <div className="text-xs text-muted-foreground sm:hidden">
                    {formatDateDe(debit.bookingDate)}
                  </div>
                </TableCell>
                <TableCell className="font-mono">{formatCents(debit.amountCents)}</TableCell>
                <TableCell className="hidden font-mono text-muted-foreground sm:table-cell">
                  {formatDateDe(debit.bookingDate)}
                </TableCell>
                <TableCell>
                  <StatusBadge variant={debit.status === "DONE" ? "success" : "warning"}>
                    {debit.status === "DONE" ? "abgeschlossen" : "offen"}
                  </StatusBadge>
                </TableCell>
              </TableRow>
            ))}
            {debits.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Keine SEPA-Lastschriften vorhanden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
