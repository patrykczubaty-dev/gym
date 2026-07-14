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
import { createNews } from "@/server/actions/news";
import { Plus } from "lucide-react";

export function NewsCreateDialog({
  locations,
}: {
  locations: { id: string; city: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createNews(undefined, formData);
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
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Erstellen
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>News erstellen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject" required>Betreff</Label>
            <Input id="subject" name="subject" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message" required>Nachricht</Label>
            <Textarea id="message" name="message" rows={5} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageUrls">Bilder (eine URL pro Zeile, optional)</Label>
            <Textarea
              id="imageUrls"
              name="imageUrls"
              rows={2}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label>An (Standorte, leer = alle)</Label>
            <div className="flex flex-wrap gap-3 rounded-md border p-2">
              {locations.map((l) => (
                <div key={l.id} className="flex items-center gap-1.5">
                  <Checkbox id={`news-loc-${l.id}`} name="locationIds" value={l.id} />
                  <Label htmlFor={`news-loc-${l.id}`} className="font-normal">
                    {l.city}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="publishOnWebsite" name="publishOnWebsite" />
            <Label htmlFor="publishOnWebsite" className="font-normal">
              Auf Website veröffentlichen
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="publishOnFacebook" name="publishOnFacebook" />
            <Label htmlFor="publishOnFacebook" className="font-normal">
              Auf Facebook veröffentlichen
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="publishOnInstagram" name="publishOnInstagram" />
            <Label htmlFor="publishOnInstagram" className="font-normal">
              Auf Instagram veröffentlichen
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sendNow" name="sendNow" />
            <Label htmlFor="sendNow" className="font-normal">
              Sofort versenden (sonst als Entwurf speichern)
            </Label>
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
