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
import { createEvent, updateEvent } from "@/server/actions/events";
import { Plus, Pencil } from "lucide-react";

type EventType = {
  id: string;
  title: string;
  description: string | null;
  participantLimit: number;
  locations: { id: string }[];
};

export function EventTypeDialog({
  event,
  locations,
}: {
  event?: EventType;
  locations: { id: string; city: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const formData = new FormData(formEvent.currentTarget);
    startTransition(async () => {
      const result = event
        ? await updateEvent(event.id, undefined, formData)
        : await createEvent(undefined, formData);
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
      {event ? (
        <DialogTrigger render={<Button variant="ghost" size="icon" title="Bearbeiten" />}>
          <Pencil className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <Plus className="size-4" />
          Event hinzufügen
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Event bearbeiten" : "Event hinzufügen"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" required>
              Event Bezeichnung
            </Label>
            <Input id="title" name="title" defaultValue={event?.title} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Kurzbeschreibung</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={event?.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label required>Standort(e)</Label>
            <div className="flex flex-wrap gap-3 rounded-md border p-2">
              {locations.map((l) => (
                <div key={l.id} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`event-loc-${l.id}`}
                    name="locationIds"
                    value={l.id}
                    defaultChecked={event?.locations.some((el) => el.id === l.id)}
                  />
                  <Label htmlFor={`event-loc-${l.id}`} className="font-normal">
                    {l.city}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="participantLimit" required>
              Teilnehmerzahl
            </Label>
            <Input
              id="participantLimit"
              name="participantLimit"
              type="number"
              min={1}
              defaultValue={event?.participantLimit ?? 20}
              required
            />
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
