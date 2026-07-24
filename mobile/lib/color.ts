// Kleine Farb-Hilfsfunktionen fuer clientseitig abgeleitete Gradients aus der
// (dynamischen, pro Gym einstellbaren) Markenfarbe - siehe branding-context.tsx.
// Bewusst nicht hart auf Rot/Orange verdrahtet, damit ein Gym mit anderer
// Markenfarbe automatisch einen stimmigen Verlauf bekommt statt eines
// hartcodierten BEEPLUS-Looks.

function hexToRgb(hex: string) {
  const n = hex.replace("#", "");
  const int = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function lighten(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r + (255 - r) * ratio, g: g + (255 - g) * ratio, b: b + (255 - b) * ratio });
}

export function darken(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r * (1 - ratio), g: g * (1 - ratio), b: b * (1 - ratio) });
}

// Warmer, energiereicher Verlauf: heller/waermerer Ton -> Markenfarbe ->
// abgedunkelter Ton, fuer Hero-Karten und Haupt-Buttons.
export function brandGradient(primaryColor: string): [string, string, string] {
  return [lighten(primaryColor, 0.22), primaryColor, darken(primaryColor, 0.3)];
}
