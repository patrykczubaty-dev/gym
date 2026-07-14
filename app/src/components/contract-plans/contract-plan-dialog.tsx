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
import { Checkbox } from "@/components/ui/checkbox";
import { createContractPlan, updateContractPlan } from "@/server/actions/contract-plans";
import { Plus, Pencil } from "lucide-react";

type ContractPlan = {
  id: string;
  name: string;
  weeklyLimit: number | null;
  notes: string | null;
};

export function ContractPlanDialog({ plan }: { plan?: ContractPlan }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isFlatrate, setIsFlatrate] = useState(plan ? plan.weeklyLimit === null : false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = plan
        ? await updateContractPlan(plan.id, undefined, formData)
        : await createContractPlan(undefined, formData);
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
        if (next) {
          setError(undefined);
          setIsFlatrate(plan ? plan.weeklyLimit === null : false);
        }
      }}
    >
      {plan ? (
        <DialogTrigger render={<Button variant="ghost" size="icon" title="Bearbeiten" />}>
          <Pencil className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <Plus className="size-4" />
          Vertragsart hinzufügen
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? "Vertragsart bearbeiten" : "Vertragsart hinzufügen"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" required>
              Bezeichnung
            </Label>
            <Input id="name" name="name" defaultValue={plan?.name} required />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isFlatrate"
              name="isFlatrate"
              checked={isFlatrate}
              onCheckedChange={(checked) => setIsFlatrate(checked === true)}
            />
            <Label htmlFor="isFlatrate" className="font-normal">
              Flatrate (unbegrenzte Kursbesuche)
            </Label>
          </div>

          {!isFlatrate && (
            <div className="space-y-2">
              <Label htmlFor="weeklyLimit">Kursbesuche pro Woche</Label>
              <Input
                id="weeklyLimit"
                name="weeklyLimit"
                type="number"
                min={1}
                defaultValue={plan?.weeklyLimit ?? 2}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea id="notes" name="notes" defaultValue={plan?.notes ?? ""} />
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
