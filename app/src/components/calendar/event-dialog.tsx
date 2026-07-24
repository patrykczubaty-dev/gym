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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCalendarEvent } from "@/server/actions/calendar";
import { toDateInputValue } from "@/lib/dates";
import { Plus } from "lucide-react";

type Course = { id: string; title: string; participantLimit: number; durationMinutes: number | null };
type Location = { id: string; city: string };

const WEEKDAY_LABELS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

function nextDecember31(): string {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), 11, 31));
}

export function EventDialog({
  courses,
  locations,
  defaultCourseDurationMinutes,
}: {
  courses: Course[];
  locations: Location[];
  defaultCourseDurationMinutes: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<"single" | "weekly">("single");
  const [noEndDate, setNoEndDate] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createCalendarEvent(undefined, formData);
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
          setMode("single");
          setNoEndDate(false);
        }
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Termin hinzufügen
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kurstermin hinzufügen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Art des Termins</Label>
            <RadioGroup
              name="mode"
              value={mode}
              onValueChange={(v) => setMode(v as "single" | "weekly")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="single" id="mode-single" />
                <Label htmlFor="mode-single" className="font-normal">
                  Einzeltermin
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="weekly" id="mode-weekly" />
                <Label htmlFor="mode-weekly" className="font-normal">
                  Wöchentlich wiederkehrend
                </Label>
              </div>
            </RadioGroup>
          </div>

          <input type="hidden" name="subjectType" value="course" />
          <div className="space-y-2">
            <Label htmlFor="subjectId" required>
              Kurs
            </Label>
            <Select
              name="subjectId"
              required
              onValueChange={(value) => {
                const subject = courses.find((c) => c.id === value);
                const capacityInput = document.getElementById(
                  "capacity",
                ) as HTMLInputElement | null;
                if (subject && capacityInput)
                  capacityInput.value = String(subject.participantLimit);

                const durationInput = document.getElementById(
                  "durationMinutes",
                ) as HTMLInputElement | null;
                if (durationInput) {
                  durationInput.value = String(subject?.durationMinutes ?? defaultCourseDurationMinutes);
                }
              }}
            >
              <SelectTrigger id="subjectId" className="w-full">
                <SelectValue placeholder="Bitte wählen" />
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
            <Label htmlFor="locationId" required>
              Standort
            </Label>
            <Select name="locationId" required>
              <SelectTrigger id="locationId" className="w-full">
                <SelectValue placeholder="Bitte wählen" />
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

          {mode === "single" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={toDateInputValue(new Date())}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startHour">Uhrzeit</Label>
                <Input
                  id="startHour"
                  name="startHour"
                  type="number"
                  min={0}
                  max={23}
                  defaultValue={9}
                  required
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">Wochentag</Label>
                  <Select name="dayOfWeek" defaultValue="1">
                    <SelectTrigger id="dayOfWeek" className="w-full">
                      <SelectValue>{(v: string) => WEEKDAY_LABELS[Number(v)]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAY_LABELS.map((label, index) => (
                        <SelectItem key={label} value={String(index)}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startHour">Uhrzeit</Label>
                  <Input
                    id="startHour"
                    name="startHour"
                    type="number"
                    min={0}
                    max={23}
                    defaultValue={9}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from">Ab</Label>
                  <Input
                    id="from"
                    name="from"
                    type="date"
                    defaultValue={toDateInputValue(new Date())}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">Bis</Label>
                  <Input
                    id="to"
                    name="to"
                    type="date"
                    defaultValue={nextDecember31()}
                    disabled={noEndDate}
                    required={!noEndDate}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="noEndDate"
                  name="noEndDate"
                  checked={noEndDate}
                  onCheckedChange={(checked) => setNoEndDate(checked === true)}
                />
                <Label htmlFor="noEndDate" className="font-normal">
                  Kein Enddatum (nie endend)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Es werden alle passenden Wochentage im Zeitraum angelegt, gesetzliche Feiertage
                werden automatisch übersprungen.
              </p>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Dauer (Minuten)</Label>
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={5}
                max={720}
                step={5}
                defaultValue={defaultCourseDurationMinutes}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Teilnehmer-Kapazität</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min={1}
                defaultValue={10}
                required
              />
            </div>
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
