"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCustomerVoucher } from "@/server/actions/customers";
import { formatDateDe } from "@/lib/dates";

type VoucherType = { id: string; label: string };
type Voucher = {
  voucherType: { label: string };
  validUntil: Date;
  remainingSessions: number;
} | null;

export function CustomerVoucherForm({
  customerId,
  voucherTypes,
  currentVoucher,
}: {
  customerId: string;
  voucherTypes: VoucherType[];
  currentVoucher: Voucher;
}) {
  const action = updateCustomerVoucher.bind(null, customerId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="space-y-3 rounded-lg border bg-background p-4">
      <h3 className="font-medium">Gutschein</h3>
      {currentVoucher && (
        <p className="text-sm text-muted-foreground">
          Aktuell: {currentVoucher.voucherType.label} — noch{" "}
          {currentVoucher.remainingSessions} Einheiten, gültig bis{" "}
          {formatDateDe(currentVoucher.validUntil)}
        </p>
      )}
      <form action={formAction} className="flex items-end gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="voucherTypeId" required>
            Gutschein zuweisen
          </Label>
          <Select name="voucherTypeId" required>
            <SelectTrigger id="voucherTypeId" className="w-full">
              <SelectValue placeholder="Bitte wählen" />
            </SelectTrigger>
            <SelectContent>
              {voucherTypes.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Zuweisen…" : "Zuweisen"}
        </Button>
      </form>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}
