import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { HexAvatar } from "@/components/ui/hex-avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerPersonForm } from "@/components/customers/customer-person-form";
import { CustomerPhotoForm } from "@/components/customers/customer-photo-form";
import { CustomerBankForm } from "@/components/customers/customer-bank-form";
import { CustomerContractForm } from "@/components/customers/customer-contract-form";
import { CustomerVoucherForm } from "@/components/customers/customer-voucher-form";
import { formatDateDe } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { Mail } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  INACTIVE: "Inaktiv",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [customer, locations, voucherTypes, contractPlans] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        location: true,
        bankAccount: true,
        contract: true,
        voucher: { include: { voucherType: true } },
        sepaDebits: { orderBy: { bookingDate: "desc" } },
      },
    }),
    prisma.location.findMany({ orderBy: { city: "asc" } }),
    prisma.voucherType.findMany({ orderBy: { sessionCount: "asc" } }),
    prisma.contractPlan.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  if (!customer) notFound();

  const isContract = customer.contractType === "CONTRACT";

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
      <div className="space-y-4">
        <div className="rounded-lg border bg-background p-4 text-center">
          <HexAvatar
            photoUrl={customer.photoUrl}
            initials={`${customer.firstName[0]}${customer.lastName[0]}`}
            className="mx-auto size-24 text-2xl"
          />
          <h2 className="mt-3 font-semibold">
            {customer.firstName} {customer.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Geburtstag: {formatDateDe(customer.birthday)}
          </p>
          <div className="mt-2">
            <StatusBadge
              variant={
                customer.status === "ACTIVE"
                  ? "success"
                  : customer.status === "PAUSED"
                    ? "warning"
                    : "outline"
              }
            >
              {STATUS_LABEL[customer.status]}
            </StatusBadge>
          </div>
          <Button
            className="mt-3 w-full"
            variant="outline"
            nativeButton={false}
            render={<a href={customer.email ? `mailto:${customer.email}` : undefined} />}
          >
            <Mail className="size-4" />
            E-Mail senden
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">
          {customer.firstName} {customer.lastName}
        </h1>
        <Tabs defaultValue="person">
          <TabsList>
            <TabsTrigger value="person">Person</TabsTrigger>
            <TabsTrigger value="foto">Foto</TabsTrigger>
            {isContract && <TabsTrigger value="bankkonto">Bankkonto</TabsTrigger>}
            {isContract && <TabsTrigger value="sepa">SEPA-Lastschrift(en)</TabsTrigger>}
            {isContract && <TabsTrigger value="vertrag">Vertragdetails</TabsTrigger>}
          </TabsList>

          <TabsContent value="person" className="space-y-4">
            <CustomerPersonForm
              key={customer.updatedAt.toISOString()}
              customer={customer}
              locations={locations}
            />
            {customer.contractType === "VOUCHER" && (
              <CustomerVoucherForm
                customerId={customer.id}
                voucherTypes={voucherTypes}
                currentVoucher={customer.voucher}
              />
            )}
          </TabsContent>

          <TabsContent value="foto">
            <CustomerPhotoForm id={customer.id} photoUrl={customer.photoUrl} />
          </TabsContent>

          {isContract && (
            <TabsContent value="bankkonto">
              <CustomerBankForm
                key={customer.bankAccount?.id ?? "new"}
                customerId={customer.id}
                bankAccount={customer.bankAccount}
              />
            </TabsContent>
          )}

          {isContract && (
            <TabsContent value="sepa">
              <div className="overflow-x-auto rounded-lg border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Betrag</TableHead>
                      <TableHead>Buchungsdatum</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.sepaDebits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Keine SEPA-Lastschriften vorhanden.
                        </TableCell>
                      </TableRow>
                    )}
                    {customer.sepaDebits.map((debit) => (
                      <TableRow key={debit.id}>
                        <TableCell className="font-mono">{formatCents(debit.amountCents)}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {formatDateDe(debit.bookingDate)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge variant={debit.status === "DONE" ? "success" : "warning"}>
                            {debit.status === "DONE" ? "abgeschlossen" : "offen"}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}

          {isContract && customer.contract && (
            <TabsContent value="vertrag">
              <CustomerContractForm
                key={customer.contract.updatedAt.toISOString()}
                customer={customer}
                contract={customer.contract}
                contractPlans={contractPlans}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
