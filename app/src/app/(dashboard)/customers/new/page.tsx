import { prisma } from "@/lib/prisma";
import { CustomerCreateForm } from "@/components/customers/customer-create-form";

export default async function NewCustomerPage() {
  const locations = await prisma.location.findMany({ orderBy: { city: "asc" } });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Kunden hinzufügen</h1>
      <CustomerCreateForm locations={locations} />
    </div>
  );
}
