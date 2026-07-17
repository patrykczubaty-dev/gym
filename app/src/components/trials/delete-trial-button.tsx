"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteTrial } from "@/server/actions/trials";
import { Trash2 } from "lucide-react";

export function DeleteTrialButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Löschen"
      aria-label="Probetraining löschen"
      disabled={pending}
      onClick={() => {
        if (!confirm("Dieses Probetraining wirklich löschen?")) return;
        startTransition(async () => {
          const result = await deleteTrial(id);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
