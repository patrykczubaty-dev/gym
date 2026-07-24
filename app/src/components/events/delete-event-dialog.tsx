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
import { deleteEventWithSchedule, getAffectedBookingsCountForEvent } from "@/server/actions/events";
import { Trash2 } from "lucide-react";

export function DeleteEventDialog({
  eventId,
  calendarEventId,
  onDeleted,
}: {
  eventId: string;
  calendarEventId: string;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    getAffectedBookingsCountForEvent(calendarEventId).then((result) => {
      if ("count" in result) setCount(result.count);
    });
  }, [open, calendarEventId]);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEventWithSchedule(eventId, calendarEventId);
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
          <DialogTitle>Event löschen?</DialogTitle>
        </DialogHeader>

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
            {pending ? "Löschen…" : "Event löschen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
