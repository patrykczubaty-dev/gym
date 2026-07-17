import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  ensureReadableOnBackground,
  hexToRgb,
  rgbToHex,
} from "./contrast";

describe("hexToRgb / rgbToHex", () => {
  it("konvertiert 6-stelligen Hexcode", () => {
    expect(hexToRgb("#e2483d")).toEqual({ r: 226, g: 72, b: 61 });
  });

  it("konvertiert 3-stelligen Hexcode (Kurzform)", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("rundtrippt rgbToHex(hexToRgb(x)) verlustfrei", () => {
    expect(rgbToHex(hexToRgb("#1c1613"))).toBe("#1c1613");
  });
});

describe("contrastRatio", () => {
  it("schwarz auf weiss ergibt den maximalen Kontrast 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("identische Farben ergeben Kontrast 1:1", () => {
    expect(contrastRatio("#e2483d", "#e2483d")).toBeCloseTo(1, 5);
  });

  it("ist symmetrisch (Reihenfolge der Argumente egal)", () => {
    expect(contrastRatio("#e2483d", "#1c1613")).toBeCloseTo(
      contrastRatio("#1c1613", "#e2483d"),
      10,
    );
  });
});

describe("ensureReadableOnBackground", () => {
  const DARK_BG = "#1c1613"; // Sidebar-Hintergrund

  it("laesst eine bereits ausreichend kontrastreiche Farbe unveraendert", () => {
    const result = ensureReadableOnBackground("#ffffff", DARK_BG);
    expect(result.adjusted).toBe(false);
    expect(result.color).toBe("#ffffff");
  });

  it("hellt eine zu dunkle Farbe auf dunklem Grund auf, bis 4,5:1 erreicht sind", () => {
    // #7a1a12 ist ein sehr dunkles Rot, das auf #1c1613 unter 4.5:1 faellt.
    const dark = "#7a1a12";
    expect(contrastRatio(dark, DARK_BG)).toBeLessThan(4.5);

    const result = ensureReadableOnBackground(dark, DARK_BG);
    expect(result.adjusted).toBe(true);
    expect(contrastRatio(result.color, DARK_BG)).toBeGreaterThanOrEqual(4.5);
  });

  it("erreicht fuer die Standard-Markenfarbe #e2483d auf der Sidebar mindestens 4,5:1", () => {
    const result = ensureReadableOnBackground("#e2483d", DARK_BG);
    expect(contrastRatio(result.color, DARK_BG)).toBeGreaterThanOrEqual(4.5);
  });

  it("gibt bei einer sehr niedrigen Zielschwelle die Originalfarbe zurueck", () => {
    const result = ensureReadableOnBackground("#7a1a12", DARK_BG, 1.5);
    expect(result.adjusted).toBe(false);
    expect(result.color).toBe("#7a1a12");
  });

  const LIGHT_BG = "#faf6f2"; // Seitenhintergrund (Light Theme)

  it("dunkelt eine zu helle Farbe auf hellem Grund ab statt sie weiter aufzuhellen", () => {
    // #ffcc00 (helles Gelb) faellt auf #faf6f2 unter 4.5:1.
    const light = "#ffcc00";
    expect(contrastRatio(light, LIGHT_BG)).toBeLessThan(4.5);

    const result = ensureReadableOnBackground(light, LIGHT_BG);
    expect(result.adjusted).toBe(true);
    expect(contrastRatio(result.color, LIGHT_BG)).toBeGreaterThanOrEqual(4.5);
    // Muss dunkler geworden sein (nicht Richtung Weiss, das wuerde den
    // Kontrast auf hellem Grund verschlechtern statt verbessern).
    expect(hexToRgb(result.color).g).toBeLessThan(hexToRgb(light).g);
  });

  it("erreicht fuer die Standard-Markenfarbe #e2483d auf dem hellen Seitenhintergrund mindestens 4,5:1", () => {
    const result = ensureReadableOnBackground("#e2483d", LIGHT_BG);
    expect(contrastRatio(result.color, LIGHT_BG)).toBeGreaterThanOrEqual(4.5);
  });
});
