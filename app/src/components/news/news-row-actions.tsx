"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveNews, sendNews } from "@/server/actions/news";
import { Send, Archive } from "lucide-react";

export function NewsRowActions({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex justify-end gap-1">
      {status === "DRAFT" && (
        <Button
          variant="ghost"
          size="icon"
          title="Jetzt senden"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await sendNews(id);
              if (result?.error) toast.error(result.error);
            })
          }
        >
          <Send className="size-4" />
        </Button>
      )}
      {status !== "ARCHIVED" && (
        <Button
          variant="ghost"
          size="icon"
          title="Archivieren"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await archiveNews(id);
              if (result?.error) toast.error(result.error);
            })
          }
        >
          <Archive className="size-4" />
        </Button>
      )}
    </div>
  );
}
