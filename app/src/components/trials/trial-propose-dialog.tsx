"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { proposeTrialSlots } from "@/server/actions/trials";
import { formatDateDe } from "@/lib/dates";
import { CalendarPlus, Copy } from "lucide-react";

type Slot = {
  id: string;
  startsAt: Date;
  token: string;
  response: string;
  course: { title: string } | null;
};

const RESPONSE_LABEL: Record<string, string> = {
  PENDING: "offen",
  ACCEPTED: "zugesagt",
  DECLINED: "abgelehnt",
};

export function TrialProposeDialog({
  trialId,
  courses,
  existingSlots,
}: {
  trialId: string;
  courses: { id: string; title: string }[];
  existingSlots: Slot[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await proposeTrialSlots(trialId, undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
    });
  }

  function copyLink(token: string, action: "accept" | "decline") {
    const url = `${window.location.origin}/api/trial-response/${token}?action=${action}`;
    navigator.clipboard.writeText(url);
    toast.success("Link kopiert");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" title="Terminvorschlag" />}>
        <CalendarPlus className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Probetraining-Terminvorschlag</DialogTitle>
        </DialogHeader>

        {existingSlots.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Versendete Vorschläge</h4>
            {existingSlots.map((slot) => (
              <div key={slot.id} className="rounded border p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    {slot.course?.title ?? "—"} — {formatDateDe(slot.startsAt)}
                  </span>
                  <span className="text-muted-foreground">{RESPONSE_LABEL[slot.response]}</span>
                </div>
                {slot.response === "PENDING" && (
                  <div className="mt-1 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => copyLink(slot.token, "accept")}
                    >
                      <Copy className="size-3" /> Zusage-Link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => copyLink(slot.token, "decline")}
                    >
                      <Copy className="size-3" /> Absage-Link
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">
              Training auswählen<span className="text-destructive">*</span>
            </p>
            <Select name="slot1CourseId" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Bitte wählen" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label htmlFor="slot1Date">Datum</Label>
            <Input id="slot1Date" name="slot1Date" type="datetime-local" required />
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Alternativ-Training (optional)</p>
            <Select name="slot2CourseId">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Bitte wählen" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label htmlFor="slot2Date">Alternativ-Datum</Label>
            <Input id="slot2Date" name="slot2Date" type="datetime-local" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Senden…" : "Vorschlag speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
