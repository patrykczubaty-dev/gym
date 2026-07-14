"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteEvent } from "@/server/actions/events";
import { Trash2 } from "lucide-react";

export function DeleteEventButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Löschen"
      disabled={pending}
      onClick={() => {
        if (!confirm("Dieses Event wirklich löschen?")) return;
        startTransition(async () => {
          const result = await deleteEvent(id);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
