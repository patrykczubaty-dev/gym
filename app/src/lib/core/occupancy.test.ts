import { describe, expect, it } from "vitest";
import { getOccupancyStatus } from "./occupancy";

describe("getOccupancyStatus", () => {
  it("grün, wenn weniger als 80% der Plätze belegt sind", () => {
    expect(getOccupancyStatus(0, 10)).toBe("green");
    expect(getOccupancyStatus(7, 10)).toBe("green");
  });

  it("gelb, wenn nur noch 20% oder weniger frei sind", () => {
    expect(getOccupancyStatus(8, 10)).toBe("yellow");
    expect(getOccupancyStatus(9, 10)).toBe("yellow");
  });

  it("rot, wenn alle Plätze belegt sind", () => {
    expect(getOccupancyStatus(10, 10)).toBe("red");
    expect(getOccupancyStatus(11, 10)).toBe("red");
  });

  it("grün bei Kapazität 0 wird nicht durch Division-durch-Null gestört (gilt als voll)", () => {
    expect(getOccupancyStatus(0, 0)).toBe("red");
  });
});
