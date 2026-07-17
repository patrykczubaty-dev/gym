"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { createGym } from "@/server/actions/platform-gyms";
import { Plus } from "lucide-react";

export function CreateGymDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [resetUrl, setResetUrl] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createGym(undefined, formData);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setError(undefined);
      if (result && "success" in result) setResetUrl(result.resetUrl);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setError(undefined);
          setResetUrl(undefined);
        }
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Gym anlegen
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Gym anlegen</DialogTitle>
        </DialogHeader>

        {resetUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-success">
              Gym wurde angelegt. E-Mail-Versand ist in diesem Entwurf noch nicht angebunden —
              bitte den Link zur Passwortvergabe direkt an den Gym-Administrator weitergeben:
            </p>
            <Link
              href={resetUrl}
              className="block truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm text-primary hover:underline"
            >
              {resetUrl}
            </Link>
            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)}>
                Fertig
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" required>
                Gym-Name
              </Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Kontakt-E-Mail (optional)</Label>
              <Input id="contactEmail" name="contactEmail" type="email" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street" required>
                  Strasse (1. Standort)
                </Label>
                <Input id="street" name="street" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip" required>
                  PLZ
                </Label>
                <Input id="zip" name="zip" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" required>
                Ort
              </Label>
              <Input id="city" name="city" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminFirstName" required>
                  Admin-Vorname
                </Label>
                <Input id="adminFirstName" name="adminFirstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminLastName" required>
                  Admin-Nachname
                </Label>
                <Input id="adminLastName" name="adminLastName" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail" required>
                Admin-E-Mail (Login des 1. Mitarbeiters)
              </Label>
              <Input id="adminEmail" name="adminEmail" type="email" required />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Wird angelegt…" : "Gym anlegen"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
