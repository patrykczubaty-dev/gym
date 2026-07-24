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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEventWithSchedule, updateEventWithSchedule } from "@/server/actions/events";
import { toDateInputValue } from "@/lib/dates";
import { Plus, Pencil } from "lucide-react";

type Location = { id: string; city: string };

type ExistingEvent = {
  id: string;
  calendarEventId: string;
  title: string;
  description: string | null;
  participantLimit: number;
  locationId: string;
  startsAt: Date;
  endsAt: Date;
};

// Events sind bewusst 1:1 mit ihrem Termin (kein wiederkehrendes Event,
// siehe Absprache) - Anlegen und Terminieren passiert deshalb in einem
// Dialog statt wie bei Kursen getrennt (Typ auf dieser Seite, Termin im
// Kalender).
export function EventDialog({
  event,
  locations,
}: {
  event?: ExistingEvent;
  locations: Location[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const initialMode =
    event && toDateInputValue(event.startsAt) !== toDateInputValue(event.endsAt) ? "range" : "single";
  const [dateMode, setDateMode] = useState<"single" | "range">(initialMode);
  const [pending, startTransition] = useTransition();

  const durationMinutes = event
    ? Math.round((event.endsAt.getTime() - event.startsAt.getTime()) / 60_000)
    : 60;

  function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const formData = new FormData(formEvent.currentTarget);
    startTransition(async () => {
      const result = event
        ? await updateEventWithSchedule(event.id, event.calendarEventId, undefined, formData)
        : await createEventWithSchedule(undefined, formData);
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
          setDateMode(initialMode);
        }
      }}
    >
      {event ? (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" title="Bearbeiten" />}>
          <Pencil className="size-4" />
          <span className="sr-only">Bearbeiten</span>
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
            <Label htmlFor="locationId" required>
              Standort
            </Label>
            <Select name="locationId" defaultValue={event?.locationId} required>
              <SelectTrigger id="locationId" className="w-full">
                <SelectValue placeholder="Bitte wählen">
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

          <div className="space-y-2">
            <Label>Zeitraum</Label>
            <RadioGroup
              name="dateMode"
              value={dateMode}
              onValueChange={(v) => setDateMode(v as "single" | "range")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="single" id="mode-single" />
                <Label htmlFor="mode-single" className="font-normal">
                  Eintägig
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="range" id="mode-range" />
                <Label htmlFor="mode-range" className="font-normal">
                  Mehrtägig
                </Label>
              </div>
            </RadioGroup>
          </div>

          {dateMode === "single" ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" required>
                  Datum
                </Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={toDateInputValue(event?.startsAt ?? new Date())}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startHour" required>
                  Uhrzeit
                </Label>
                <Input
                  id="startHour"
                  name="startHour"
                  type="number"
                  min={0}
                  max={23}
                  defaultValue={event?.startsAt.getHours() ?? 9}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMinutes" required>
                  Dauer (Min.)
                </Label>
                <Input
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  min={5}
                  max={720}
                  step={5}
                  defaultValue={durationMinutes}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromDate" required>
                  Von Datum
                </Label>
                <Input
                  id="fromDate"
                  name="fromDate"
                  type="date"
                  defaultValue={toDateInputValue(event?.startsAt ?? new Date())}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromHour" required>
                  Von Uhrzeit
                </Label>
                <Input
                  id="fromHour"
                  name="fromHour"
                  type="number"
                  min={0}
                  max={23}
                  defaultValue={event?.startsAt.getHours() ?? 9}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate" required>
                  Bis Datum
                </Label>
                <Input
                  id="toDate"
                  name="toDate"
                  type="date"
                  defaultValue={toDateInputValue(event?.endsAt ?? new Date())}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toHour" required>
                  Bis Uhrzeit
                </Label>
                <Input
                  id="toHour"
                  name="toHour"
                  type="number"
                  min={0}
                  max={23}
                  defaultValue={event?.endsAt.getHours() ?? 18}
                  required
                />
              </div>
            </div>
          )}

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
