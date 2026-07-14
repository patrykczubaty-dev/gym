"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { updateEmployeePermissions } from "@/server/actions/employees";
import { PERMISSION_KEYS, PERMISSION_LABELS, type PermissionKey } from "@/lib/enums";

type Employee = Record<PermissionKey, boolean> & { id: string };

export function EmployeePermissionsForm({ employee }: { employee: Employee }) {
  const action = updateEmployeePermissions.bind(null, employee.id);

  return (
    <form action={action} className="space-y-4 rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">
        Die Berechtigung „Administrator“ beinhaltet und übertrumpft alle anderen
        Berechtigungen.
      </p>
      <div className="divide-y">
        {PERMISSION_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between py-2.5">
            <Label htmlFor={key} className="font-normal">
              {PERMISSION_LABELS[key]}
            </Label>
            <Checkbox
              id={key}
              name={key}
              defaultChecked={employee[key]}
            />
          </div>
        ))}
      </div>
      <Button type="submit">Speichern</Button>
    </form>
  );
}
