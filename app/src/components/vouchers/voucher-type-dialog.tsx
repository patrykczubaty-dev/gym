"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createVoucherType, updateVoucherType } from "@/server/actions/vouchers";
import { centsToEuros } from "@/lib/money";
import { Plus, Pencil } from "lucide-react";

type VoucherType = {
  id: string;
  label: string;
  validityMonths: number;
  sessionCount: number;
  priceCents: number;
  notes: string | null;
};

export function VoucherTypeDialog({ voucherType }: { voucherType?: VoucherType }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = voucherType
        ? await updateVoucherType(voucherType.id, undefined, formData)
        : await createVoucherType(undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(undefined);
      }}
    >
      {voucherType ? (
        <DialogTrigger render={<Button variant="ghost" size="icon" title="Bearbeiten" />}>
          <Pencil className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <Plus className="size-4" />
          Gutschein hinzufügen
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {voucherType ? "Gutschein bearbeiten" : "Gutschein hinzufügen"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label" required>
              Gutschein Bezeichnung
            </Label>
            <Input id="label" name="label" defaultValue={voucherType?.label} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validityMonths">Gültigkeit (Monate)</Label>
              <Input
                id="validityMonths"
                name="validityMonths"
                type="number"
                min={1}
                defaultValue={voucherType?.validityMonths ?? 12}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionCount">Kursanzahl</Label>
              <Input
                id="sessionCount"
                name="sessionCount"
                type="number"
                min={1}
                defaultValue={voucherType?.sessionCount ?? 10}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceEuros">Preis (€)</Label>
            <Input
              id="priceEuros"
              name="priceEuros"
              type="number"
              step="0.01"
              min={0}
              defaultValue={centsToEuros(voucherType?.priceCents ?? 0)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea id="notes" name="notes" defaultValue={voucherType?.notes ?? ""} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
