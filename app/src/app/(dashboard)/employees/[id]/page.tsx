import { notFound } from "next/navigation";
import { withGymScope } from "@/lib/scoped-prisma";
import { getCurrentEmployee } from "@/lib/dal";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { HexAvatar } from "@/components/ui/hex-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeePersonForm } from "@/components/employees/employee-person-form";
import { EmployeePhotoForm } from "@/components/employees/employee-photo-form";
import { EmployeeBankForm } from "@/components/employees/employee-bank-form";
import { EmployeePermissionsForm } from "@/components/employees/employee-permissions-form";
import { formatDateDe } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { Mail } from "lucide-react";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { gymId } = await getCurrentEmployee();

  const [employee, locations] = await withGymScope(gymId, (db) =>
    Promise.all([
      db.employee.findUnique({
        where: { id },
        include: { payouts: { orderBy: { date: "desc" } } },
      }),
      db.location.findMany({ orderBy: { city: "asc" } }),
    ]),
  );

  if (!employee) notFound();

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
      <div className="space-y-4">
        <div className="rounded-lg border bg-background p-4 text-center">
          <HexAvatar
            photoUrl={employee.photoUrl}
            initials={`${employee.firstName[0]}${employee.lastName[0]}`}
            className="mx-auto size-24 text-2xl"
          />
          <h2 className="mt-3 font-semibold">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Geburtstag: {formatDateDe(employee.birthday)}
          </p>
          <Button
            className="mt-3 w-full"
            variant="outline"
            nativeButton={false}
            render={<a href={`mailto:${employee.email}`} />}
          >
            <Mail className="size-4" />
            E-Mail senden
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">
          {employee.firstName} {employee.lastName}
        </h1>
        <Tabs defaultValue="person">
          <TabsList>
            <TabsTrigger value="person">Person</TabsTrigger>
            <TabsTrigger value="foto">Foto</TabsTrigger>
            <TabsTrigger value="bankkonto">Bankkonto</TabsTrigger>
            <TabsTrigger value="Überweisungen">Überweisungen</TabsTrigger>
            <TabsTrigger value="berechtigung">Berechtigung</TabsTrigger>
          </TabsList>
          <TabsContent value="person">
            <EmployeePersonForm
              key={employee.updatedAt.toISOString()}
              employee={employee}
              locations={locations}
            />
          </TabsContent>
          <TabsContent value="foto">
            <EmployeePhotoForm id={employee.id} photoUrl={employee.photoUrl} />
          </TabsContent>
          <TabsContent value="bankkonto">
            <EmployeeBankForm key={employee.updatedAt.toISOString()} employee={employee} />
          </TabsContent>
          <TabsContent value="Überweisungen">
            <div className="overflow-x-auto rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Betrag</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.payouts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Keine Überweisungen vorhanden.
                      </TableCell>
                    </TableRow>
                  )}
                  {employee.payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-mono">{formatCents(payout.amountCents)}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {formatDateDe(payout.date)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={payout.status === "DONE" ? "success" : "warning"}>
                          {payout.status === "DONE" ? "abgeschlossen" : "offen"}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="berechtigung">
            <EmployeePermissionsForm
              key={employee.updatedAt.toISOString()}
              employee={employee}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
