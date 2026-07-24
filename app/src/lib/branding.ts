import { ensureReadableOnBackground } from "@/lib/core/contrast";

// Reine Branding-Aufloesung (kein DB-/Server-Import), damit sowohl Server
// Components (dashboard layout, login) als auch die Live-Vorschau im
// Branding-Formular (Client-Komponente, unsaved State) dieselbe Logik
// verwenden - eine Abweichung zwischen Vorschau und tatsaechlichem Ergebnis
// waere ein Vertrauensbruch (Nielsen: Konsistenz).

export const DEFAULT_STUDIO_NAME = "BEEPLUS";
export const DEFAULT_PRIMARY_COLOR = "#4A6FA0";
export const DEFAULT_LOGIN_CLAIM =
  "Mitglieder, Kurse und Verträge — alles an einem Ort.";

// Sidebar-Hintergrund (in beiden Themes identisch, siehe globals.css) - die
// Referenzflaeche fuer den Kontrast-Guardrail, da die Primaerfarbe dort als
// Text (aktive Nav-Zustaende) verwendet wird.
export const BRAND_DARK_SURFACE = "#1c1613";

// Seitenhintergruende je Theme (siehe globals.css `--background`) - Referenz
// fuer den Kontrast-Guardrail der Akzentfarbe, da diese als Text auf
// Ueberschriften (h1-h3, Card-/Dialog-Titel) verwendet wird und dort - anders
// als die Primaerfarbe - nicht immer auf der dunklen Sidebar liegt.
export const LIGHT_PAGE_SURFACE = "#faf6f2";
export const DARK_PAGE_SURFACE = "#14100e";

export type GymBrandingFields = {
  name: string;
  logoUrl: string | null;
  logoOnDarkUrl: string | null;
  logoOnLightUrl: string | null;
  faviconUrl: string | null;
  loginClaim: string | null;
  primaryColor: string | null;
  accentColor: string | null;
};

export type ResolvedBranding = {
  studioName: string;
  loginClaim: string;
  logoUrl: string | null;
  logoOnDarkUrl: string | null;
  logoOnLightUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  primaryTextSafe: string;
  primaryWasAdjusted: boolean;
  accentColor: string | null;
  // Ueberschriftenfarbe je Theme, kontrastgeprueft gegen den Seitenhintergrund.
  // null, solange keine Akzentfarbe gesetzt ist (dann bleibt die normale
  // Textfarbe unangetastet).
  headingColorLight: string | null;
  headingColorDark: string | null;
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function resolveGymBranding(gym: GymBrandingFields | null): ResolvedBranding {
  const primaryColor =
    gym?.primaryColor && HEX_COLOR.test(gym.primaryColor)
      ? gym.primaryColor
      : DEFAULT_PRIMARY_COLOR;
  const { color: primaryTextSafe, adjusted: primaryWasAdjusted } =
    ensureReadableOnBackground(primaryColor, BRAND_DARK_SURFACE);

  const accentColor =
    gym?.accentColor && HEX_COLOR.test(gym.accentColor) ? gym.accentColor : null;
  const headingColorLight = accentColor
    ? ensureReadableOnBackground(accentColor, LIGHT_PAGE_SURFACE).color
    : null;
  const headingColorDark = accentColor
    ? ensureReadableOnBackground(accentColor, DARK_PAGE_SURFACE).color
    : null;

  return {
    studioName: gym?.name || DEFAULT_STUDIO_NAME,
    loginClaim: gym?.loginClaim || DEFAULT_LOGIN_CLAIM,
    logoUrl: gym?.logoUrl ?? null,
    logoOnDarkUrl: gym?.logoOnDarkUrl ?? null,
    logoOnLightUrl: gym?.logoOnLightUrl ?? null,
    faviconUrl: gym?.faviconUrl ?? null,
    primaryColor,
    primaryTextSafe,
    primaryWasAdjusted,
    accentColor,
    headingColorLight,
    headingColorDark,
  };
}

// Ueberschreibt die im Standard fest verdrahteten Farb-Tokens (siehe
// globals.css) programmatisch pro Gym. Bewusst NICHT ueberschrieben:
// Statusfarben (--destructive/--success/--warning), Text-/Hintergrundtoene,
// Abstaende, Radien - das bleibt das Qualitaetsversprechen der Plattform.
// `:root` gewinnt gegenueber den Light-/Dark-Theme-Regeln aus globals.css
// per Dokumentreihenfolge (dieser Style-Block wird nach globals.css
// gerendert), daher genuegt ein einzelner Selektor fuer beide Themes.
export function brandingStyleTag(branding: ResolvedBranding): string {
  const { primaryColor, primaryTextSafe, accentColor, headingColorLight, headingColorDark } =
    branding;
  const secondary = accentColor ?? primaryColor;
  let css = `:root{--primary:${primaryColor};--sidebar-primary:${primaryColor};--sidebar-ring:color-mix(in srgb, ${primaryColor} 50%, transparent);--ring:color-mix(in srgb, ${primaryColor} 45%, transparent);--accent:color-mix(in srgb, ${primaryColor} 10%, transparent);--accent-foreground:${primaryTextSafe};--chart-2:${secondary};}`;
  // Ueberschriften (h1-h3, Card-/Dialog-Titel) faerben sich nur ein, wenn
  // eine Akzentfarbe gesetzt ist - sonst bleibt die normale Textfarbe
  // erhalten (siehe globals.css, `.font-heading` faellt sonst auf `inherit`
  // zurueck). Getrennt je Theme, da Akzentfarben auf hellem/dunklem
  // Seitenhintergrund unterschiedlich nachgehellt/abgedunkelt werden muessen.
  if (headingColorLight && headingColorDark) {
    css += `:root{--heading-color:${headingColorLight};}.dark{--heading-color:${headingColorDark};}`;
  }
  return css;
}
