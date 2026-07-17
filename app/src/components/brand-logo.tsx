import Image from "next/image";
import { cn } from "@/lib/utils";

// Zeigt automatisch die passende Logo-Variante fürs aktuelle Farbschema
// (per CSS, nicht per JS -> kein Hydration-Flackern). "onDark" erzwingt die
// helle Logo-Variante unabhängig vom App-Theme, z.B. für die immer dunkle
// Sidebar.
//
// Per-Gym-Override: `logoUrl` ist das hochgeladene Standard-Logo,
// `logoOnDarkUrl`/`logoOnLightUrl` optionale Varianten fuer den jeweiligen
// Hintergrund, falls das Standard-Logo dort nicht funktioniert (siehe
// src/lib/branding.ts). Ohne Override faellt alles auf die eingebauten
// BEEPLUS-Assets zurueck. Uploads laufen ueber ein natives <img>, da
// next/image feste, zur Buildzeit bekannte Ziel-Dimensionen voraussetzt.
export function BrandLogo({
  className,
  onDark = false,
  priority = false,
  studioName = "BEEPLUS",
  logoUrl,
  logoOnDarkUrl,
  logoOnLightUrl,
}: {
  className?: string;
  onDark?: boolean;
  priority?: boolean;
  studioName?: string;
  logoUrl?: string | null;
  logoOnDarkUrl?: string | null;
  logoOnLightUrl?: string | null;
}) {
  if (onDark) {
    const src = logoOnDarkUrl ?? logoUrl;
    if (src) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={studioName} className={cn("h-auto w-auto object-contain", className)} />;
    }
    return (
      <Image
        src="/logo-dark-bg.png"
        alt={studioName}
        width={791}
        height={280}
        priority={priority}
        className={cn("h-auto w-auto object-contain", className)}
      />
    );
  }

  const lightSrc = logoOnLightUrl ?? logoUrl;
  if (lightSrc) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={lightSrc} alt={studioName} className={cn("h-auto w-auto object-contain", className)} />;
  }

  return (
    <>
      <Image
        src="/logo-light-bg.png"
        alt={studioName}
        width={794}
        height={282}
        priority={priority}
        className={cn("h-auto w-auto object-contain dark:hidden", className)}
      />
      <Image
        src="/logo-dark-bg.png"
        alt={studioName}
        width={791}
        height={280}
        priority={priority}
        className={cn("hidden h-auto w-auto object-contain dark:block", className)}
      />
    </>
  );
}
