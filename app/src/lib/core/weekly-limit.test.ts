import { describe, expect, it } from "vitest";
import { isWithinWeeklyLimit } from "./weekly-limit";

describe("isWithinWeeklyLimit", () => {
  it("erlaubt beliebig viele Buchungen bei Flatrate (weeklyLimit = null)", () => {
    expect(isWithinWeeklyLimit(0, null)).toBe(true);
    expect(isWithinWeeklyLimit(99, null)).toBe(true);
  });

  it("erlaubt eine weitere Buchung, solange das Limit noch nicht erreicht ist", () => {
    expect(isWithinWeeklyLimit(1, 2)).toBe(true);
  });

  it("verbietet eine weitere Buchung, sobald das Limit erreicht ist", () => {
    expect(isWithinWeeklyLimit(2, 2)).toBe(false);
  });

  it("verbietet eine weitere Buchung, wenn das Limit bereits ueberschritten ist", () => {
    expect(isWithinWeeklyLimit(3, 2)).toBe(false);
  });
});
