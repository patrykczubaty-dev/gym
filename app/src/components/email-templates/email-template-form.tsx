"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateEmailTemplate } from "@/server/actions/email-templates";

export function EmailTemplateForm({
  id,
  label,
  body,
}: {
  id: string;
  label: string;
  body: string;
}) {
  const action = updateEmailTemplate.bind(null, id);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between">
        <Label htmlFor={`body-${id}`} className="font-medium">
          {label}
        </Label>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern…" : "Speichern"}
        </Button>
      </div>
      <Textarea id={`body-${id}`} name="body" defaultValue={body} rows={3} />
      <p className="text-xs text-muted-foreground">
        Variablen wie <code>{"{{Vorname}}"}</code> werden beim Versenden automatisch ersetzt.
      </p>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
