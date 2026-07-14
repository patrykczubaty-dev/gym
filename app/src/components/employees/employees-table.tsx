"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { HexAvatar } from "@/components/ui/hex-avatar";
import { deleteEmployees } from "@/server/actions/employees";
import { Trash2 } from "lucide-react";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  photoUrl: string | null;
  leadCourses: { title: string }[];
};

export function EmployeesTable({ employees }: { employees: Employee[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleDelete() {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size} Mitarbeiter wirklich löschen?`)) return;
    startTransition(async () => {
      const result = await deleteEmployees(Array.from(selected));
      if (result?.error) {
        toast.error(result.error);
      } else {
        setSelected(new Set());
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={selected.size === 0 || pending}
          onClick={handleDelete}
        >
          <Trash2 className="size-4" />
          Ausgewählte Mitarbeiter löschen
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Vorname, Name</TableHead>
              <TableHead className="hidden sm:table-cell">Geschlecht</TableHead>
              <TableHead className="hidden md:table-cell">Kurse</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(employee.id)}
                    onCheckedChange={(checked) =>
                      toggle(employee.id, checked === true)
                    }
                  />
                </TableCell>
                <TableCell className="max-w-[10rem] whitespace-normal break-words sm:max-w-none">
                  <Link
                    href={`/employees/${employee.id}`}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    <HexAvatar
                      photoUrl={employee.photoUrl}
                      initials={`${employee.firstName[0]}${employee.lastName[0]}`}
                      className="size-7 text-xs"
                    />
                    <span>
                      <span className="block">
                        {employee.firstName} {employee.lastName}
                      </span>
                      <span className="block text-xs font-normal text-muted-foreground md:hidden">
                        {employee.leadCourses.length > 0
                          ? employee.leadCourses.map((c) => c.title).join(", ")
                          : "—"}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {employee.gender === "w" ? "W" : "M"}
                </TableCell>
                <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
                  {employee.leadCourses.length > 0
                    ? employee.leadCourses.map((c) => c.title).join(", ")
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
