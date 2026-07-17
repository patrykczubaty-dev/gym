// WCAG-2-Kontrastberechnung fuer den Branding-Guardrail (siehe
// src/lib/branding.ts): eine vom Kunden gewaehlte Primaerfarbe wird als
// Text auf dunklem Grund (Sidebar, aktive Nav-Zustaende) verwendet. Faellt
// der Kontrast unter 4,5:1 (WCAG AA fuer normalen Text), wird die Farbe fuer
// Textverwendungen automatisch aufgehellt - die Rohfarbe bleibt fuer
// Flaechen (Buttons etc.) unangetastet.

export const WCAG_AA_NORMAL_TEXT_RATIO = 4.5;

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

// Mischt die Farbe schrittweise mit Weiss/Schwarz (linear pro Kanal), um sie
// auf-/abzudunkeln, ohne den Farbton wesentlich zu verschieben.
function mixWithWhite(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({
    r: r + (255 - r) * ratio,
    g: g + (255 - g) * ratio,
    b: b + (255 - b) * ratio,
  });
}

function mixWithBlack(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r * (1 - ratio), g: g * (1 - ratio), b: b * (1 - ratio) });
}

// Passt `hex` in kleinen Schritten an, bis der Kontrast gegen `backgroundHex`
// mindestens `minRatio` erreicht (oder die Farbe komplett schwarz/weiss ist).
// Richtung haengt vom Hintergrund ab: auf dunklem Grund wird aufgehellt, auf
// hellem Grund abgedunkelt - andersherum wuerde der Kontrast schlechter statt
// besser (z.B. eine helle Farbe auf hellem Grund weiter Richtung Weiss zu
// mischen verschlimmert das Problem).
export function ensureReadableOnBackground(
  hex: string,
  backgroundHex: string,
  minRatio: number = WCAG_AA_NORMAL_TEXT_RATIO,
): { color: string; adjusted: boolean } {
  if (contrastRatio(hex, backgroundHex) >= minRatio) {
    return { color: hex, adjusted: false };
  }
  const backgroundIsDark = relativeLuminance(hexToRgb(backgroundHex)) < 0.5;
  const mix = backgroundIsDark ? mixWithWhite : mixWithBlack;
  const fallback = backgroundIsDark ? "#ffffff" : "#000000";
  const STEP = 0.04;
  for (let ratio = STEP; ratio <= 1; ratio += STEP) {
    const candidate = mix(hex, ratio);
    if (contrastRatio(candidate, backgroundHex) >= minRatio) {
      return { color: candidate, adjusted: true };
    }
  }
  return { color: fallback, adjusted: true };
}
