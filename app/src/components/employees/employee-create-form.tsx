"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEmployee } from "@/server/actions/employees";
import { GENDER_LABELS } from "@/lib/enums";

type Location = { id: string; city: string };

export function EmployeeCreateForm({ locations }: { locations: Location[] }) {
  const [state, formAction, pending] = useActionState(createEmployee, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-background p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" required>Vorname</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" required>Nachname</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gender">Geschlecht</Label>
          <Select name="gender" defaultValue="w">
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
          <Label htmlFor="locationId" required>Am Standort</Label>
          <Select name="locationId" defaultValue={locations[0]?.id} required>
            <SelectTrigger id="locationId" className="w-full">
              <SelectValue>
                {(v: string) => locations.find((l) => l.id === v)?.city}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="birthday" required>Geburtstag</Label>
          <Input id="birthday" name="birthday" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="employeeSince" required>Mitarbeiter seit</Label>
          <Input id="employeeSince" name="employeeSince" type="date" required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="street">Strasse</Label>
          <Input id="street" name="street" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">PLZ</Label>
          <Input id="zip" name="zip" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">Ort</Label>
        <Input id="city" name="city" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 space-y-2">
          <Label htmlFor="email" required>E-Mail</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobil</Label>
          <Input id="mobile" name="mobile" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" required>Initial-Passwort</Label>
        <Input id="password" name="password" type="password" required minLength={6} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
