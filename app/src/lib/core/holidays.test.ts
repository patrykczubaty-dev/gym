import { describe, expect, it } from "vitest";
import { getGermanPublicHolidays, isGermanPublicHoliday } from "./holidays";

function fmt(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

describe("getGermanPublicHolidays", () => {
  it("berechnet die bundesweiten Feiertage 2026 korrekt (Ostersonntag 2026: 5. April)", () => {
    const holidays = getGermanPublicHolidays(2026).map(fmt);
    expect(holidays).toEqual([
      "2026-01-01", // Neujahr
      "2026-04-03", // Karfreitag
      "2026-04-06", // Ostermontag
      "2026-05-01", // Tag der Arbeit
      "2026-05-14", // Christi Himmelfahrt
      "2026-05-25", // Pfingstmontag
      "2026-10-03", // Tag der Deutschen Einheit
      "2026-12-25", // 1. Weihnachtsfeiertag
      "2026-12-26", // 2. Weihnachtsfeiertag
    ]);
  });

  it("berechnet die bundesweiten Feiertage 2025 korrekt (Ostersonntag 2025: 20. April)", () => {
    const holidays = getGermanPublicHolidays(2025).map(fmt);
    expect(holidays).toContain("2025-04-18"); // Karfreitag
    expect(holidays).toContain("2025-04-21"); // Ostermontag
    expect(holidays).toContain("2025-05-29"); // Christi Himmelfahrt
    expect(holidays).toContain("2025-06-09"); // Pfingstmontag
  });
});

describe("isGermanPublicHoliday", () => {
  it("erkennt Neujahr und Weihnachten als Feiertag", () => {
    expect(isGermanPublicHoliday(new Date(2026, 0, 1))).toBe(true);
    expect(isGermanPublicHoliday(new Date(2026, 11, 25))).toBe(true);
  });

  it("erkennt einen gewöhnlichen Montag nicht als Feiertag", () => {
    expect(isGermanPublicHoliday(new Date(2026, 6, 13))).toBe(false);
  });
});
