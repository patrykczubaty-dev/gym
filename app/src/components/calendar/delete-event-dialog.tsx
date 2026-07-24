"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { deleteCalendarEvent, getAffectedBookingsCount, type EditScope } from "@/server/actions/calendar";
import { Trash2 } from "lucide-react";

export function DeleteEventDialog({
  eventId,
  seriesId,
  onDeleted,
}: {
  eventId: string;
  seriesId: string | null;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<EditScope>("single");
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    getAffectedBookingsCount(eventId, scope).then((result) => {
      if ("count" in result) setCount(result.count);
    });
  }, [open, scope, eventId]);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCalendarEvent(eventId, scope);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      onDeleted?.();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setScope("single");
          setError(undefined);
          setCount(null);
        }
      }}
    >
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" className="text-destructive" title="Löschen" />}
      >
        <Trash2 className="size-4" />
        <span className="sr-only">Löschen</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Termin löschen?</DialogTitle>
        </DialogHeader>

        {seriesId && (
          <div className="space-y-2">
            <Label>Anwenden auf</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => {
                setScope(v as EditScope);
                setCount(null);
              }}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="single" id="delete-scope-single" />
                <Label htmlFor="delete-scope-single" className="font-normal">
                  Nur diesen Termin
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="following" id="delete-scope-following" />
                <Label htmlFor="delete-scope-following" className="font-normal">
                  Diesen und alle folgenden
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="series" id="delete-scope-series" />
                <Label htmlFor="delete-scope-series" className="font-normal">
                  Die ganze Serie
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        <p className="text-sm">
          {count === null
            ? "Prüfe betroffene Buchungen…"
            : count > 0
              ? `${count} ${count === 1 ? "Buchung ist" : "Buchungen sind"} betroffen und ${count === 1 ? "wird" : "werden"} storniert.`
              : "Keine Buchungen betroffen."}
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={pending || count === null}>
            {pending ? "Löschen…" : "Termin löschen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
