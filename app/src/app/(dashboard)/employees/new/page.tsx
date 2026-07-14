import { prisma } from "@/lib/prisma";
import { EmployeeCreateForm } from "@/components/employees/employee-create-form";

export default async function NewEmployeePage() {
  const locations = await prisma.location.findMany({ orderBy: { city: "asc" } });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Mitarbeiter hinzufügen</h1>
      <EmployeeCreateForm locations={locations} />
    </div>
  );
}
