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
import { VoucherTypeDialog } from "@/components/vouchers/voucher-type-dialog";
import { DeleteVoucherTypeButton } from "@/components/vouchers/delete-voucher-type-button";
import { VouchersNav } from "@/components/vouchers/vouchers-nav";
import { formatCents } from "@/lib/money";

export default async function VouchersPage() {
  const { gymId } = await getCurrentEmployee();
  const voucherTypes = await withGymScope(gymId, (db) =>
    db.voucherType.findMany({ orderBy: { sessionCount: "asc" } }),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Gutscheine</h1>
        <VoucherTypeDialog />
      </div>

      <VouchersNav active="overview" />

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gutschein Bezeichnung</TableHead>
              <TableHead className="hidden sm:table-cell">Gültigkeit (Monate)</TableHead>
              <TableHead className="hidden sm:table-cell">Kursanzahl</TableHead>
              <TableHead className="hidden sm:table-cell">Preis</TableHead>
              <TableHead className="hidden lg:table-cell">Notizen</TableHead>
              <TableHead className="w-24 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {voucherTypes.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="max-w-[9rem] font-medium whitespace-normal break-words sm:max-w-none">
                  <div>{v.label}</div>
                  <div className="text-xs font-normal text-muted-foreground sm:hidden">
                    {v.validityMonths} Monate · {v.sessionCount} Kurse · {formatCents(v.priceCents)}
                  </div>
                </TableCell>
                <TableCell className="hidden font-mono sm:table-cell">{v.validityMonths}</TableCell>
                <TableCell className="hidden font-mono sm:table-cell">{v.sessionCount}</TableCell>
                <TableCell className="hidden font-mono sm:table-cell">{formatCents(v.priceCents)}</TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {v.notes ?? "—"}
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <VoucherTypeDialog voucherType={v} />
                  <DeleteVoucherTypeButton id={v.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
