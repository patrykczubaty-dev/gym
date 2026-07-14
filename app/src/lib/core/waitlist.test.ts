import { describe, expect, it } from "vitest";
import { resolveWaitlistPromotion } from "./waitlist";

describe("resolveWaitlistPromotion", () => {
  const waitlist = [
    { id: "a", waitlistPosition: 1 },
    { id: "b", waitlistPosition: 2 },
    { id: "c", waitlistPosition: 3 },
  ];

  it("bei 1 frei gewordenem Platz rückt nur Platz 1 nach", () => {
    const result = resolveWaitlistPromotion(waitlist, 1);
    expect(result.promoted.map((e) => e.id)).toEqual(["a"]);
    expect(result.remaining).toEqual([
      { id: "b", waitlistPosition: 1 },
      { id: "c", waitlistPosition: 2 },
    ]);
  });

  it("der zweite Wartelistenplatz braucht zwei frei werdende Plätze", () => {
    const result = resolveWaitlistPromotion(waitlist, 2);
    expect(result.promoted.map((e) => e.id)).toEqual(["a", "b"]);
    expect(result.remaining).toEqual([{ id: "c", waitlistPosition: 1 }]);
  });

  it("ohne frei werdende Plätze rückt niemand nach", () => {
    const result = resolveWaitlistPromotion(waitlist, 0);
    expect(result.promoted).toEqual([]);
    expect(result.remaining).toEqual(waitlist);
  });

  it("mehr frei werdende Plätze als Wartelisteneinträge befördert die gesamte Liste", () => {
    const result = resolveWaitlistPromotion(waitlist, 10);
    expect(result.promoted.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(result.remaining).toEqual([]);
  });
});
