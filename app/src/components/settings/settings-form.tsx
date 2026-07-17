"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/server/actions/settings";

export function SettingsForm({
  defaultNoticePeriodMonths,
  defaultAutoRenewalMonths,
}: {
  defaultNoticePeriodMonths: number;
  defaultAutoRenewalMonths: number;
}) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-background p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="defaultNoticePeriodMonths">
            Standard-Kündigungsfrist (Monate vor Vertragsablauf)
          </Label>
          <Input
            id="defaultNoticePeriodMonths"
            name="defaultNoticePeriodMonths"
            type="number"
            min={0}
            defaultValue={defaultNoticePeriodMonths}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultAutoRenewalMonths">
            Standardmäßige automatische Verlängerung (Monate)
          </Label>
          <Input
            id="defaultAutoRenewalMonths"
            name="defaultAutoRenewalMonths"
            type="number"
            min={0}
            defaultValue={defaultAutoRenewalMonths}
            required
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Diese Werte werden als Vorschlag beim Anlegen neuer Verträge verwendet und können pro
        Vertrag im Kunden-Vertragsdetails-Tab individuell überschrieben werden.
      </p>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
