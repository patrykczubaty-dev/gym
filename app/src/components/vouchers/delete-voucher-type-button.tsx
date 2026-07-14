"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteVoucherType } from "@/server/actions/vouchers";
import { Trash2 } from "lucide-react";

export function DeleteVoucherTypeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Löschen"
      disabled={pending}
      onClick={() => {
        if (!confirm("Diesen Gutschein-Typ wirklich löschen?")) return;
        startTransition(async () => {
          const result = await deleteVoucherType(id);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
