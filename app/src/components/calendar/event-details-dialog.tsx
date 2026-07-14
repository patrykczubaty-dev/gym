"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cancelBooking } from "@/server/actions/calendar";
import { formatDateDe } from "@/lib/dates";
import type { OccupancyStatus } from "@/lib/enums";
import { X } from "lucide-react";

type Booking = {
  id: string;
  status: string;
  waitlistPosition: number | null;
  customer: { firstName: string; lastName: string };
};

export function EventDetailsDialog({
  courseTitle,
  startsAt,
  locationCity,
  capacity,
  occupancy,
  bookings,
  children,
}: {
  courseTitle: string;
  startsAt: Date;
  locationCity: string;
  capacity: number;
  occupancy: OccupancyStatus;
  bookings: Booking[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const booked = bookings.filter((b) => b.status === "BOOKED");
  const waitlisted = bookings
    .filter((b) => b.status === "WAITLISTED")
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));

  function handleCancel(id: string) {
    startTransition(async () => {
      const result = await cancelBooking(id);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button type="button" className="block w-full text-left" />}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{courseTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {formatDateDe(startsAt)},{" "}
          {startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}{" "}
          Uhr — {locationCity}
        </p>
        <p className="text-sm">
          Belegung: {booked.length} / {capacity}{" "}
          <Badge
            variant={
              occupancy === "green" ? "success" : occupancy === "yellow" ? "secondary" : "destructive"
            }
          >
            {occupancy === "green" ? "frei" : occupancy === "yellow" ? "fast voll" : "voll"}
          </Badge>
        </p>

        <div className="space-y-1">
          <h4 className="text-sm font-medium">Angemeldet</h4>
          {booked.length === 0 && (
            <p className="text-sm text-muted-foreground">Noch niemand angemeldet.</p>
          )}
          {booked.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
              <span>{b.customer.firstName} {b.customer.lastName}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                onClick={() => handleCancel(b.id)}
                title="Abmelden"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {waitlisted.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Warteliste</h4>
            {waitlisted.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                <span>
                  #{b.waitlistPosition} — {b.customer.firstName} {b.customer.lastName}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  onClick={() => handleCancel(b.id)}
                  title="Von Warteliste entfernen"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
