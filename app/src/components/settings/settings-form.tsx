"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/server/actions/settings";

export function SettingsForm({
  defaultNoticePeriodMonths,
  defaultAutoRenewalMonths,
  defaultWaitlistLimit,
  defaultCourseDurationMinutes,
}: {
  defaultNoticePeriodMonths: number;
  defaultAutoRenewalMonths: number;
  defaultWaitlistLimit: number | null;
  defaultCourseDurationMinutes: number;
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

      <div className="grid grid-cols-2 gap-4 border-t pt-4">
        <div className="space-y-2">
          <Label htmlFor="defaultWaitlistLimit">Wartelisten-Länge (allgemein)</Label>
          <Input
            id="defaultWaitlistLimit"
            name="defaultWaitlistLimit"
            type="number"
            min={0}
            placeholder="Leer = unbegrenzt"
            defaultValue={defaultWaitlistLimit ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultCourseDurationMinutes">Kursdauer (allgemein, Min.)</Label>
          <Input
            id="defaultCourseDurationMinutes"
            name="defaultCourseDurationMinutes"
            type="number"
            min={5}
            max={720}
            step={5}
            defaultValue={defaultCourseDurationMinutes}
            required
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Diese Werte gelten für alle Kurse, solange nichts explizit am einzelnen Kurs geändert
        wird (siehe Kurs-Formular).
      </p>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
