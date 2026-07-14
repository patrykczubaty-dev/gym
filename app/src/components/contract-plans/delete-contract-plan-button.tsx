"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteContractPlan } from "@/server/actions/contract-plans";
import { Trash2 } from "lucide-react";

export function DeleteContractPlanButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Löschen"
      disabled={pending}
      onClick={() => {
        if (!confirm("Diese Vertragsart wirklich löschen?")) return;
        startTransition(async () => {
          const result = await deleteContractPlan(id);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
