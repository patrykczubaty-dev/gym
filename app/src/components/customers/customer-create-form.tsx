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
import { LocationMultiSelect } from "@/components/shared/location-multi-select";
import { createCustomer } from "@/server/actions/customers";
import { toDateInputValue } from "@/lib/dates";
import { GENDER_LABELS, CONTRACT_TYPE_LABELS } from "@/lib/enums";

type Location = { id: string; city: string };

export function CustomerCreateForm({ locations }: { locations: Location[] }) {
  const [state, formAction, pending] = useActionState(createCustomer, undefined);

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
          <Label htmlFor="birthday" required>Geburtstag</Label>
          <Input id="birthday" name="birthday" type="date" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contractType">Vertragsart</Label>
          <Select name="contractType" defaultValue="CONTRACT">
            <SelectTrigger id="contractType" className="w-full">
              <SelectValue>
                {(v: string) => CONTRACT_TYPE_LABELS[v as "CONTRACT" | "VOUCHER" | "TRIAL"]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CONTRACT">Vertrag</SelectItem>
              <SelectItem value="VOUCHER">Gutschein</SelectItem>
              <SelectItem value="TRIAL">Probetraining</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label required>Standorte</Label>
          <LocationMultiSelect
            locations={locations}
            defaultLocationIds={locations[0] ? [locations[0].id] : []}
            defaultAllLocations={false}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="joinedAt" required>Eintrittsdatum</Label>
        <Input
          id="joinedAt"
          name="joinedAt"
          type="date"
          defaultValue={toDateInputValue(new Date())}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="street">Strasse</Label>
          <Input id="street" name="street" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="houseNumber">Nr.</Label>
          <Input id="houseNumber" name="houseNumber" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="zip">PLZ</Label>
          <Input id="zip" name="zip" />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="city">Ort</Label>
          <Input id="city" name="city" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" name="email" type="email" />
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

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
