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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCourse, updateCourse } from "@/server/actions/courses";
import { toDateInputValue } from "@/lib/dates";
import { Plus, Pencil } from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string | null;
  leadTrainerId: string;
  participantLimit: number;
  trialPossible: boolean;
  trialDate: Date | null;
  locations: { id: string }[];
};

export function CourseDialog({
  course,
  employees,
  locations,
}: {
  course?: Course;
  employees: { id: string; firstName: string; lastName: string }[];
  locations: { id: string; city: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [trialPossible, setTrialPossible] = useState(course?.trialPossible ?? false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = course
        ? await updateCourse(course.id, undefined, formData)
        : await createCourse(undefined, formData);
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
          setTrialPossible(course?.trialPossible ?? false);
        }
      }}
    >
      {course ? (
        <DialogTrigger render={<Button variant="ghost" size="icon" title="Bearbeiten" />}>
          <Pencil className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <Plus className="size-4" />
          Kurs hinzufügen
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{course ? "Kurs bearbeiten" : "Kurs hinzufügen"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" required>
              Kurs Bezeichnung
            </Label>
            <Input id="title" name="title" defaultValue={course?.title} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Kurzbeschreibung</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={course?.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label required>Standort(e)</Label>
            <div className="flex flex-wrap gap-3 rounded-md border p-2">
              {locations.map((l) => (
                <div key={l.id} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`loc-${l.id}`}
                    name="locationIds"
                    value={l.id}
                    defaultChecked={course?.locations.some((cl) => cl.id === l.id)}
                  />
                  <Label htmlFor={`loc-${l.id}`} className="font-normal">
                    {l.city}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leadTrainerId" required>
              Leitender Trainer
            </Label>
            <Select name="leadTrainerId" defaultValue={course?.leadTrainerId} required>
              <SelectTrigger id="leadTrainerId" className="w-full">
                <SelectValue>
                  {(v: string) => {
                    const e = employees.find((e) => e.id === v);
                    return e ? `${e.firstName} ${e.lastName}` : undefined;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="participantLimit" required>
              Max. Teilnehmer
            </Label>
            <Input
              id="participantLimit"
              name="participantLimit"
              type="number"
              min={1}
              defaultValue={course?.participantLimit ?? 10}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Probetraining möglich</Label>
            <RadioGroup
              name="trialPossible"
              defaultValue={trialPossible ? "yes" : "no"}
              onValueChange={(v) => setTrialPossible(v === "yes")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="trial-yes" />
                <Label htmlFor="trial-yes" className="font-normal">ja</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="trial-no" />
                <Label htmlFor="trial-no" className="font-normal">nein</Label>
              </div>
            </RadioGroup>
          </div>

          {trialPossible && (
            <div className="space-y-2">
              <Label htmlFor="trialDate">Probetraining-Datum</Label>
              <Input
                id="trialDate"
                name="trialDate"
                type="date"
                defaultValue={toDateInputValue(course?.trialDate)}
              />
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
