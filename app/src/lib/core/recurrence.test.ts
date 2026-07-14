import { describe, expect, it } from "vitest";
import { getWeeklyOccurrences } from "./recurrence";

function fmt(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

describe("getWeeklyOccurrences", () => {
  it("findet alle Montage in einem 4-Wochen-Zeitraum, beginnend an einem Montag", () => {
    const result = getWeeklyOccurrences({
      dayOfWeek: 1, // Montag
      from: new Date(2026, 6, 13), // Montag, 13.07.2026
      to: new Date(2026, 7, 10), // Montag, 10.08.2026
    }).map(fmt);
    expect(result).toEqual(["2026-07-13", "2026-07-20", "2026-07-27", "2026-08-03", "2026-08-10"]);
  });

  it("findet den ersten passenden Wochentag, wenn der Zeitraum nicht an diesem Wochentag beginnt", () => {
    const result = getWeeklyOccurrences({
      dayOfWeek: 4, // Donnerstag
      from: new Date(2026, 6, 13), // Montag
      to: new Date(2026, 6, 20), // Montag (nächste Woche)
    }).map(fmt);
    expect(result).toEqual(["2026-07-16"]);
  });

  it("liefert eine leere Liste, wenn der Zeitraum vor dem Start endet", () => {
    const result = getWeeklyOccurrences({
      dayOfWeek: 1,
      from: new Date(2026, 6, 20),
      to: new Date(2026, 6, 13),
    });
    expect(result).toEqual([]);
  });
});
