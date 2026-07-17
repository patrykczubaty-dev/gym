import { withGymScope } from "@/lib/scoped-prisma";
import { getCurrentEmployee } from "@/lib/dal";
import { EmployeeCreateForm } from "@/components/employees/employee-create-form";

export default async function NewEmployeePage() {
  const { gymId } = await getCurrentEmployee();
  const locations = await withGymScope(gymId, (db) =>
    db.location.findMany({ orderBy: { city: "asc" } }),
  );

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Mitarbeiter hinzufügen</h1>
      <EmployeeCreateForm locations={locations} />
    </div>
  );
}
