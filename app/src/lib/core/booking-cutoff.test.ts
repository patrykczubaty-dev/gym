import { describe, expect, it } from "vitest";
import { canCancelBooking } from "./booking-cutoff";

describe("canCancelBooking", () => {
  const now = new Date("2026-01-10T10:00:00Z");

  it("erlaubt Stornierung ohne Frist (cutoffHours = null) unabhaengig vom Zeitpunkt", () => {
    const inOneMinute = new Date("2026-01-10T10:01:00Z");
    expect(canCancelBooking(inOneMinute, null, now)).toBe(true);
  });

  it("erlaubt Stornierung, wenn genug Zeit vor Kursbeginn liegt", () => {
    const in3Hours = new Date("2026-01-10T13:00:00Z");
    expect(canCancelBooking(in3Hours, 2, now)).toBe(true);
  });

  it("erlaubt Stornierung exakt an der Frist-Grenze", () => {
    const inExactly2Hours = new Date("2026-01-10T12:00:00Z");
    expect(canCancelBooking(inExactly2Hours, 2, now)).toBe(true);
  });

  it("verbietet Stornierung innerhalb der Frist", () => {
    const in90Minutes = new Date("2026-01-10T11:30:00Z");
    expect(canCancelBooking(in90Minutes, 2, now)).toBe(false);
  });

  it("verbietet Stornierung, wenn der Kurs schon begonnen hat", () => {
    const inThePast = new Date("2026-01-10T09:00:00Z");
    expect(canCancelBooking(inThePast, 2, now)).toBe(false);
  });
});
