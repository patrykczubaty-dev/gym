import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { CustomersTable } from "@/components/customers/customers-table";
import { Plus } from "lucide-react";

export default async function CustomersPage() {
  const [customers, locations] = await Promise.all([
    prisma.customer.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        contractType: true,
        photoUrl: true,
        joinedAt: true,
        locationId: true,
        location: { select: { city: true } },
      },
    }),
    prisma.location.findMany({ orderBy: { city: "asc" }, select: { id: true, city: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Kunden</h1>
        <Button nativeButton={false} render={<Link href="/customers/new" />}>
          <Plus className="size-4" />
          Kunden hinzufügen
        </Button>
      </div>
      <CustomersTable customers={customers} locations={locations} />
    </div>
  );
}
