"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteCourse } from "@/server/actions/courses";
import { Trash2 } from "lucide-react";

export function DeleteCourseButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Löschen"
      disabled={pending}
      onClick={() => {
        if (!confirm("Diesen Kurs wirklich löschen?")) return;
        startTransition(async () => {
          const result = await deleteCourse(id);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
