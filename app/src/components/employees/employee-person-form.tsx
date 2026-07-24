"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationMultiSelect } from "@/components/shared/location-multi-select";
import { updateEmployeePerson } from "@/server/actions/employees";
import { toDateInputValue } from "@/lib/dates";
import { GENDER_LABELS } from "@/lib/enums";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthday: Date;
  employeeSince: Date;
  locations: { id: string; city: string }[];
  street: string | null;
  zip: string | null;
  city: string | null;
  email: string;
  phone: string | null;
  mobile: string | null;
  notes: string | null;
};

export function EmployeePersonForm({
  employee,
  locations,
}: {
  employee: Employee;
  locations: { id: string; city: string }[];
}) {
  const action = updateEmployeePerson.bind(null, employee.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-background p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" required>Vorname</Label>
          <Input id="firstName" name="firstName" defaultValue={employee.firstName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" required>Nachname</Label>
          <Input id="lastName" name="lastName" defaultValue={employee.lastName} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gender">Geschlecht</Label>
          <Select name="gender" defaultValue={employee.gender}>
            <SelectTrigger id="gender" className="w-full">
              <SelectValue>{(v: string) => GENDER_LABELS[v as "w" | "m"]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="w">weiblich</SelectItem>
              <SelectItem value="m">männlich</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="locationIds" required>Am Standort</Label>
          <LocationMultiSelect
            locations={locations}
            defaultLocationIds={employee.locations.map((l) => l.id)}
            showAllOption={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="birthday" required>Geburtstag</Label>
          <Input
            id="birthday"
            name="birthday"
            type="date"
            defaultValue={toDateInputValue(employee.birthday)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="employeeSince" required>Mitarbeiter seit</Label>
          <Input
            id="employeeSince"
            name="employeeSince"
            type="date"
            defaultValue={toDateInputValue(employee.employeeSince)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="street">Strasse</Label>
          <Input id="street" name="street" defaultValue={employee.street ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">PLZ</Label>
          <Input id="zip" name="zip" defaultValue={employee.zip ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">Ort</Label>
        <Input id="city" name="city" defaultValue={employee.city ?? ""} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email" required>E-Mail</Label>
          <Input id="email" name="email" type="email" defaultValue={employee.email} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" defaultValue={employee.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobil</Label>
          <Input id="mobile" name="mobile" defaultValue={employee.mobile ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" name="notes" defaultValue={employee.notes ?? ""} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
