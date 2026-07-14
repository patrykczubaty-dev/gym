import { cn } from "@/lib/utils";

const SIZE_CLASSES: Record<string, string> = {
  sm: "size-6 text-[10px]",
  default: "size-8 text-xs",
  lg: "size-10 text-sm",
};

// Hexagon-Avatar (Bienenwaben-Signature-Motiv). Eigenständige, einfache
// Implementierung statt einer Anpassung von <Avatar>, da deren Ring-Rahmen
// als Pseudo-Element separat "rounded-full" ist und sich nicht sauber mit
// einem clip-path überschreiben lässt.
export function HexAvatar({
  photoUrl,
  initials,
  size = "default",
  className,
}: {
  photoUrl?: string | null;
  initials: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "hex-clip flex shrink-0 items-center justify-center border border-border bg-muted font-mono font-medium text-muted-foreground",
        SIZE_CLASSES[size],
        className,
      )}
      style={
        photoUrl
          ? { backgroundImage: `url(${photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      {!photoUrl && initials}
    </span>
  );
}
