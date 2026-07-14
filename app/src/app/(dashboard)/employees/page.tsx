import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { EmployeesTable } from "@/components/employees/employees-table";
import { Plus } from "lucide-react";

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      photoUrl: true,
      leadCourses: { select: { title: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Mitarbeiter</h1>
        <Button nativeButton={false} render={<Link href="/employees/new" />}>
          <Plus className="size-4" />
          Mitarbeiter hinzufügen
        </Button>
      </div>
      <EmployeesTable employees={employees} />
    </div>
  );
}
