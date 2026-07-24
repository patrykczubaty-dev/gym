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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCalendarEvent, type EditScope } from "@/server/actions/calendar";
import { toDateInputValue } from "@/lib/dates";
import { Pencil } from "lucide-react";

type Course = { id: string; title: string; participantLimit: number };
type Location = { id: string; city: string };

type ExistingEvent = {
  id: string;
  seriesId: string | null;
  subjectId: string;
  locationId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
};

// Nur fuer Kurstermine - Event-Termine werden auf der Events-Seite bearbeitet
// (siehe Absprache: Kurse und Events nicht vermischen), diese Komponente
// wird fuer sie deshalb gar nicht erst gerendert (siehe EventDetailsDialog).
export function EditEventDialog({
  event,
  courses,
  locations,
  onSaved,
}: {
  event: ExistingEvent;
  courses: Course[];
  locations: Location[];
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [scope, setScope] = useState<EditScope>("single");
  const [pending, startTransition] = useTransition();

  const durationMinutes = Math.round((event.endsAt.getTime() - event.startsAt.getTime()) / 60_000);

  function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const formData = new FormData(formEvent.currentTarget);
    startTransition(async () => {
      const result = await updateCalendarEvent(event.id, undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setOpen(false);
      onSaved?.();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setError(undefined);
          setScope("single");
        }
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" title="Bearbeiten" />}>
        <Pencil className="size-4" />
        <span className="sr-only">Bearbeiten</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kurstermin bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="scope" value={scope} />

          {event.seriesId && (
            <div className="space-y-2">
              <Label>Anwenden auf</Label>
              <RadioGroup
                value={scope}
                onValueChange={(v) => setScope(v as EditScope)}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="single" id="edit-scope-single" />
                  <Label htmlFor="edit-scope-single" className="font-normal">
                    Nur diesen Termin
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="following" id="edit-scope-following" />
                  <Label htmlFor="edit-scope-following" className="font-normal">
                    Diesen und alle folgenden
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="series" id="edit-scope-series" />
                  <Label htmlFor="edit-scope-series" className="font-normal">
                    Die ganze Serie
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <input type="hidden" name="subjectType" value="course" />
          <div className="space-y-2">
            <Label htmlFor="edit-subjectId" required>
              Kurs
            </Label>
            <Select name="subjectId" defaultValue={event.subjectId} required>
              <SelectTrigger id="edit-subjectId" className="w-full">
                <SelectValue placeholder="Bitte wählen">
                  {(v: string) => courses.find((s) => s.id === v)?.title}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {courses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-locationId" required>
              Standort
            </Label>
            <Select name="locationId" defaultValue={event.locationId} required>
              <SelectTrigger id="edit-locationId" className="w-full">
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

          {scope === "single" && (
            <div className="space-y-2">
              <Label htmlFor="edit-date">Datum</Label>
              <Input
                id="edit-date"
                name="date"
                type="date"
                defaultValue={toDateInputValue(event.startsAt)}
                required
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-startHour">Uhrzeit</Label>
              <Input
                id="edit-startHour"
                name="startHour"
                type="number"
                min={0}
                max={23}
                defaultValue={event.startsAt.getHours()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-durationMinutes">Dauer (Min.)</Label>
              <Input
                id="edit-durationMinutes"
                name="durationMinutes"
                type="number"
                min={5}
                max={720}
                step={5}
                defaultValue={durationMinutes}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-capacity">Kapazität</Label>
              <Input
                id="edit-capacity"
                name="capacity"
                type="number"
                min={1}
                defaultValue={event.capacity}
                required
              />
            </div>
          </div>

          {scope !== "single" && (
            <p className="text-xs text-muted-foreground">
              Datum bleibt je Termin unverändert - nur Uhrzeit, Dauer, Kapazität, Kurs und
              Standort werden übernommen.
            </p>
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
