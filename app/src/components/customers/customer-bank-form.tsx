"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { updateCustomerBank } from "@/server/actions/customers";

type BankAccount = {
  bankName: string | null;
  iban: string | null;
  bic: string | null;
  directDebitAuthorized: boolean;
} | null;

export function CustomerBankForm({
  customerId,
  bankAccount,
}: {
  customerId: string;
  bankAccount: BankAccount;
}) {
  const action = updateCustomerBank.bind(null, customerId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-background p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bankName">Bank</Label>
          <Input id="bankName" name="bankName" defaultValue={bankAccount?.bankName ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="iban">IBAN</Label>
          <Input id="iban" name="iban" defaultValue={bankAccount?.iban ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bic">BIC</Label>
        <Input id="bic" name="bic" defaultValue={bankAccount?.bic ?? ""} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="directDebitAuthorized"
          name="directDebitAuthorized"
          defaultChecked={bankAccount?.directDebitAuthorized ?? false}
        />
        <Label htmlFor="directDebitAuthorized" className="font-normal">
          Lastschrift freigegeben (SEPA-Mandat liegt vor)
        </Label>
      </div>
      <p className="text-sm text-muted-foreground">
        SEPA-Mandat-Formular-Download folgt in einer späteren Ausbaustufe.
      </p>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
