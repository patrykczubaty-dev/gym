import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

const DOT_COLOR: Record<string, string> = {
  default: "bg-primary-foreground",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  secondary: "bg-muted-foreground",
  outline: "bg-muted-foreground",
};

// Status-Pille mit führendem Punkt (Ampel-artig), z.B. für Kunden-,
// Probetraining- oder News-Status.
export function StatusBadge({
  variant = "outline",
  className,
  children,
}: {
  variant?: VariantProps<typeof badgeVariants>["variant"];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge variant={variant} className={cn("gap-1.5 font-mono font-normal", className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT_COLOR[variant ?? "outline"])} />
      {children}
    </Badge>
  );
}
