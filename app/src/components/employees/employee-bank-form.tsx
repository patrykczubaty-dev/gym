"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateEmployeeBank } from "@/server/actions/employees";
import { centsToEuros } from "@/lib/money";

type Employee = {
  id: string;
  bankName: string | null;
  iban: string | null;
  bic: string | null;
  salaryCents: number | null;
  paymentSchedule: string | null;
};

export function EmployeeBankForm({ employee }: { employee: Employee }) {
  const action = updateEmployeeBank.bind(null, employee.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-background p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bankName">Bank</Label>
          <Input id="bankName" name="bankName" defaultValue={employee.bankName ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salaryEuros">Gehalt (€)</Label>
          <Input
            id="salaryEuros"
            name="salaryEuros"
            type="number"
            step="0.01"
            defaultValue={
              employee.salaryCents != null ? centsToEuros(employee.salaryCents) : ""
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="iban">IBAN</Label>
          <Input id="iban" name="iban" defaultValue={employee.iban ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bic">BIC</Label>
          <Input id="bic" name="bic" defaultValue={employee.bic ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Zahlungsziel</Label>
        <RadioGroup name="paymentSchedule" defaultValue={employee.paymentSchedule ?? "FIRST_OF_MONTH"}>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="FIRST_OF_MONTH" id="first" />
            <Label htmlFor="first" className="font-normal">zum 1-ten</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="FIFTEENTH_OF_MONTH" id="fifteenth" />
            <Label htmlFor="fifteenth" className="font-normal">zum 15-ten</Label>
          </div>
        </RadioGroup>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
