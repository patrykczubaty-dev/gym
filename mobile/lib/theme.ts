// Dark-only Design-Tokens (bewusste Entscheidung, kein Light-Mode-Zweig
// mehr: der Nutzer wollte eine kraeftigere, "fancy" Optik statt der
// urspruenglich vom Portal gespiegelten, eher zurueckhaltenden Farben).
// Deutlich hoeherer Kontrast/Saettigung als das Portal-Dark-Theme, um mehr
// visuelle Energie zu erzeugen - die Markenfarbe (primaryColor, dynamisch
// pro Gym) bleibt aber weiterhin der einzige Akzent, keine Fremdfarben wie
// Lila o.ae.
export const theme = {
  background: "#0c0a09",
  card: "#18130f",
  cardElevated: "#221b16",
  foreground: "#f7f3ef",
  mutedForeground: "#a89a8f",
  border: "#2b241f",
  secondary: "#221b16",
  destructive: "#ff6b6b",
  success: "#34d399",
  warning: "#fbbf24",
  primaryForeground: "#fffaf8",
} as const;

export type Theme = typeof theme;

// Kompatibilitaets-Hook (Screens riefen bisher useTheme() auf) - gibt jetzt
// immer dieselben, festen Dark-Tokens zurueck.
export function useTheme(): Theme {
  return theme;
}

export const DEFAULT_PRIMARY_COLOR = "#4A6FA0";
export const DEFAULT_STUDIO_NAME = "BEEPLUS";
