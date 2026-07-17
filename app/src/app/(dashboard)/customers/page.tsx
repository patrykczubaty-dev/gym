import Link from "next/link";
import { withGymScope } from "@/lib/scoped-prisma";
import { getCurrentEmployee } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { CustomersTable } from "@/components/customers/customers-table";
import { Plus } from "lucide-react";

export default async function CustomersPage() {
  const { gymId } = await getCurrentEmployee();
  const [customers, locations] = await withGymScope(gymId, (db) =>
    Promise.all([
      db.customer.findMany({
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
      db.location.findMany({ orderBy: { city: "asc" }, select: { id: true, city: true } }),
    ]),
  );

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
