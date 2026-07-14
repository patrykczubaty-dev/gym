"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEmployeePhoto } from "@/server/actions/employees";

export function EmployeePhotoForm({
  id,
  photoUrl,
}: {
  id: string;
  photoUrl: string | null;
}) {
  const action = updateEmployeePhoto.bind(null, id);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">
        Foto-Upload ist im ersten Entwurf noch nicht angebunden — bis dahin kann eine
        Bild-URL hinterlegt werden.
      </p>
      <div className="space-y-2">
        <Label htmlFor="photoUrl">Foto-URL</Label>
        <Input id="photoUrl" name="photoUrl" defaultValue={photoUrl ?? ""} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
