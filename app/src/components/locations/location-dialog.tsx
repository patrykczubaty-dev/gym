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
import { createLocation, updateLocation } from "@/server/actions/locations";
import { Plus, Pencil } from "lucide-react";

type Location = {
  id: string;
  city: string;
  street: string;
  zip: string;
  notes: string | null;
};

export function LocationDialog({ location }: { location?: Location }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = location
        ? await updateLocation(location.id, undefined, formData)
        : await createLocation(undefined, formData);
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
      {location ? (
        <DialogTrigger render={<Button variant="ghost" size="icon" title="Bearbeiten" />}>
          <Pencil className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <Plus className="size-4" />
          Standort hinzufügen
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {location ? "Standort bearbeiten" : "Standort hinzufügen"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="city" required>Ort</Label>
            <Input id="city" name="city" defaultValue={location?.city} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="street" required>Strasse</Label>
            <Input
              id="street"
              name="street"
              defaultValue={location?.street}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip" required>PLZ</Label>
            <Input id="zip" name="zip" defaultValue={location?.zip} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea id="notes" name="notes" defaultValue={location?.notes ?? ""} />
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
