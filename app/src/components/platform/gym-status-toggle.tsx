"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { suspendGym, reactivateGym } from "@/server/actions/platform-gyms";

export function GymStatusToggle({ gymId, status }: { gymId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const isActive = status === "ACTIVE";

  function handleClick() {
    const confirmMessage = isActive
      ? "Dieses Gym wirklich pausieren? Mitarbeiter können sich danach nicht mehr einloggen."
      : "Dieses Gym wieder aktivieren?";
    if (!confirm(confirmMessage)) return;
    startTransition(async () => {
      const result = isActive ? await suspendGym(gymId) : await reactivateGym(gymId);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={handleClick}>
      {isActive ? "Pausieren" : "Aktivieren"}
    </Button>
  );
}
