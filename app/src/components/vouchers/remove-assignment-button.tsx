"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeVoucherAssignment } from "@/server/actions/vouchers";
import { Trash2 } from "lucide-react";

export function RemoveAssignmentButton({ customerId }: { customerId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Gutschein entfernen"
      disabled={pending}
      onClick={() => {
        if (!confirm("Gutschein-Zuweisung wirklich entfernen?")) return;
        startTransition(async () => {
          const result = await removeVoucherAssignment(customerId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
