import Image from "next/image";
import { cn } from "@/lib/utils";

// Zeigt automatisch die passende Logo-Variante fürs aktuelle Farbschema
// (per CSS, nicht per JS -> kein Hydration-Flackern). "onDark" erzwingt die
// helle Logo-Variante unabhängig vom App-Theme, z.B. für die immer dunkle
// Sidebar.
export function BrandLogo({
  className,
  onDark = false,
  priority = false,
}: {
  className?: string;
  onDark?: boolean;
  priority?: boolean;
}) {
  if (onDark) {
    return (
      <Image
        src="/logo-dark-bg.png"
        alt="BEEPLUS"
        width={791}
        height={280}
        priority={priority}
        className={cn("h-auto w-auto object-contain", className)}
      />
    );
  }

  return (
    <>
      <Image
        src="/logo-light-bg.png"
        alt="BEEPLUS"
        width={794}
        height={282}
        priority={priority}
        className={cn("h-auto w-auto object-contain dark:hidden", className)}
      />
      <Image
        src="/logo-dark-bg.png"
        alt="BEEPLUS"
        width={791}
        height={280}
        priority={priority}
        className={cn("hidden h-auto w-auto object-contain dark:block", className)}
      />
    </>
  );
}
