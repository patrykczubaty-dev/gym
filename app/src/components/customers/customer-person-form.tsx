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
import { updateCustomerPerson } from "@/server/actions/customers";
import { toDateInputValue } from "@/lib/dates";
import { GENDER_LABELS, CONTRACT_TYPE_LABELS } from "@/lib/enums";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthday: Date;
  street: string | null;
  houseNumber: string | null;
  zip: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  notes: string | null;
  locationId: string;
  joinedAt: Date;
  contractType: string;
};

export function CustomerPersonForm({
  customer,
  locations,
}: {
  customer: Customer;
  locations: { id: string; city: string }[];
}) {
  const action = updateCustomerPerson.bind(null, customer.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-background p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" required>Vorname</Label>
          <Input id="firstName" name="firstName" defaultValue={customer.firstName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" required>Nachname</Label>
          <Input id="lastName" name="lastName" defaultValue={customer.lastName} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gender">Geschlecht</Label>
          <Select name="gender" defaultValue={customer.gender}>
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
          <Input
            id="birthday"
            name="birthday"
            type="date"
            defaultValue={toDateInputValue(customer.birthday)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contractType">Vertragsart</Label>
          <Select name="contractType" defaultValue={customer.contractType}>
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
          <Label htmlFor="locationId" required>Am Standort</Label>
          <Select name="locationId" defaultValue={customer.locationId} required>
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

      <div className="space-y-2">
        <Label htmlFor="joinedAt" required>Eintrittsdatum</Label>
        <Input
          id="joinedAt"
          name="joinedAt"
          type="date"
          defaultValue={toDateInputValue(customer.joinedAt)}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="street">Strasse</Label>
          <Input id="street" name="street" defaultValue={customer.street ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="houseNumber">Nr.</Label>
          <Input id="houseNumber" name="houseNumber" defaultValue={customer.houseNumber ?? ""} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="zip">PLZ</Label>
          <Input id="zip" name="zip" defaultValue={customer.zip ?? ""} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="city">Ort</Label>
          <Input id="city" name="city" defaultValue={customer.city ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" name="email" type="email" defaultValue={customer.email ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" defaultValue={customer.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobil</Label>
          <Input id="mobile" name="mobile" defaultValue={customer.mobile ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" name="notes" defaultValue={customer.notes ?? ""} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
