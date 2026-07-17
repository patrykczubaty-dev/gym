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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTrial, updateTrial } from "@/server/actions/trials";
import { Plus, Pencil } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Offen",
  PROPOSED: "Vorschlag versendet",
  ACCEPTED: "Zugesagt",
  DECLINED: "Abgelehnt",
};

type Trial = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  locationId: string;
  message: string | null;
  status: string;
};

export function TrialCreateDialog({
  trial,
  locations,
}: {
  trial?: Trial;
  locations: { id: string; city: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = trial
        ? await updateTrial(trial.id, undefined, formData)
        : await createTrial(undefined, formData);
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
      {trial ? (
        <DialogTrigger render={<Button variant="ghost" size="icon" title="Bearbeiten" aria-label="Probetraining bearbeiten" />}>
          <Pencil className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <Plus className="size-4" />
          Probetraining hinzufügen
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {trial ? "Probetraining bearbeiten" : "Probetraining hinzufügen"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" required>Vorname</Label>
              <Input id="firstName" name="firstName" defaultValue={trial?.firstName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" required>Name</Label>
              <Input id="lastName" name="lastName" defaultValue={trial?.lastName} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" defaultValue={trial?.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" defaultValue={trial?.email ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="locationId" required>Standort</Label>
            <Select
              name="locationId"
              defaultValue={trial?.locationId ?? locations[0]?.id}
              required
            >
              <SelectTrigger id="locationId" className="w-full">
                <SelectValue>
                  {(v: string) => locations.find((l) => l.id === v)?.city}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {trial && (
            <div className="space-y-2">
              <Label htmlFor="status" required>Status</Label>
              <Select name="status" defaultValue={trial.status} required>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue>{(v: string) => STATUS_LABEL[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="message">Nachricht</Label>
            <Textarea id="message" name="message" defaultValue={trial?.message ?? ""} />
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
