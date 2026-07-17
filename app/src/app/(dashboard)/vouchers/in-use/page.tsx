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
import { HexAvatar } from "@/components/ui/hex-avatar";
import { RemoveAssignmentButton } from "@/components/vouchers/remove-assignment-button";
import { VouchersNav } from "@/components/vouchers/vouchers-nav";
import { formatDateDe } from "@/lib/dates";

export default async function VouchersInUsePage() {
  const { gymId } = await getCurrentEmployee();
  const assignments = await withGymScope(gymId, (db) =>
    db.voucherAssignment.findMany({
      orderBy: { validUntil: "asc" },
      include: {
        voucherType: true,
        customer: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
    }),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Gutscheine</h1>
      <VouchersNav active="in-use" />

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vorname, Name</TableHead>
              <TableHead className="hidden sm:table-cell">Gutscheinart</TableHead>
              <TableHead className="hidden md:table-cell">Kursanzahl offen</TableHead>
              <TableHead className="hidden md:table-cell">Gültig bis</TableHead>
              <TableHead className="w-16 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="max-w-[10rem] whitespace-normal break-words sm:max-w-none">
                  <Link
                    href={`/customers/${a.customer.id}`}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    <HexAvatar
                      photoUrl={a.customer.photoUrl}
                      initials={`${a.customer.firstName[0]}${a.customer.lastName[0]}`}
                      className="size-7 text-xs"
                    />
                    <span>
                      <span className="block">
                        {a.customer.firstName} {a.customer.lastName}
                      </span>
                      <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                        {a.voucherType.label} · noch {a.remainingSessions} · bis{" "}
                        {formatDateDe(a.validUntil)}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {a.voucherType.label} / {a.voucherType.validityMonths} Monate
                </TableCell>
                <TableCell className="hidden md:table-cell">{a.remainingSessions}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDateDe(a.validUntil)}
                </TableCell>
                <TableCell className="text-right">
                  <RemoveAssignmentButton customerId={a.customerId} />
                </TableCell>
              </TableRow>
            ))}
            {assignments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Keine Gutscheine in Verwendung.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
