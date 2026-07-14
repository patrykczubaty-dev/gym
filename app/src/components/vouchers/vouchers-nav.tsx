import Link from "next/link";
import { cn } from "@/lib/utils";

export function VouchersNav({ active }: { active: "overview" | "in-use" }) {
  return (
    <div className="flex gap-2">
      <Link
        href="/vouchers"
        className={cn(
          "rounded-md border px-3 py-1.5 text-sm",
          active === "overview" ? "bg-primary text-primary-foreground" : "bg-background",
        )}
      >
        Übersicht
      </Link>
      <Link
        href="/vouchers/in-use"
        className={cn(
          "rounded-md border px-3 py-1.5 text-sm",
          active === "in-use" ? "bg-primary text-primary-foreground" : "bg-background",
        )}
      >
        In Verwendung
      </Link>
    </div>
  );
}
