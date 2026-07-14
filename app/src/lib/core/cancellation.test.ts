import { describe, expect, it } from "vitest";
import { calculateContractCancellation } from "./cancellation";

// Hinweis: Daten werden bewusst mit dem lokalen Date-Konstruktor
// new Date(year, monthIndex, day) gebaut statt als ISO-String, weil
// date-fns Monatsarithmetik in lokaler Zeit rechnet - ISO-Strings ("2016-01-01")
// werden dagegen als UTC-Mitternacht geparst, was je nach Zeitzone zu einem
// Tag Versatz führen würde.
function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

// Basisvertrag laut gymproject.md: Beigetreten 01-01-2016, Laufzeit 12 Monate
// (Vertragsende 31-12-2016), aut. Verlängerung 3 Monate, Kündigungsfrist
// "3 Monate vor Vertragsablauf" -> Kündigung möglich bis 30-09-2016.
const base = {
  joinedAt: d(2016, 1, 1),
  termMonths: 12,
  autoRenewalMonths: 3,
  noticePeriodMonths: 3,
};

describe("calculateContractCancellation", () => {
  it("berechnet 'Kündigung möglich bis' aus Vertragsende minus Kündigungsfrist", () => {
    const result = calculateContractCancellation(base);
    expect(result.contractEndDate).toEqual(d(2016, 12, 31));
    expect(result.cancellationPossibleUntil).toEqual(d(2016, 9, 30));
  });

  it("Fall 1: rechtzeitig gekündigt (kuendigung_richtig.png) -> Vertrag endet regulär", () => {
    const result = calculateContractCancellation({
      ...base,
      cancellationReceivedAt: d(2016, 9, 29),
    });
    expect(result.cancellationEffectiveAt).toEqual(d(2016, 12, 31));
    expect(result.autoRenewed).toBe(false);
  });

  it("Fall 2: einen Tag zu spät gekündigt (kuendigung_falsch.png) -> aut. Verlängerung um 3 Monate", () => {
    const result = calculateContractCancellation({
      ...base,
      cancellationReceivedAt: d(2016, 10, 1),
    });
    expect(result.cancellationEffectiveAt).toEqual(d(2017, 3, 31));
    expect(result.autoRenewed).toBe(true);
  });

  it("Fall 3: 2 Monate pausiert, keine Kündigung eingereicht (verlängerung.png) -> Vertragsende verschiebt sich", () => {
    const result = calculateContractCancellation({
      ...base,
      pausedFrom: d(2016, 3, 1),
      pausedTo: d(2016, 4, 30),
      cancellationReceivedAt: null,
    });
    expect(result.cancellationPossibleUntil).toEqual(d(2016, 11, 30));
    expect(result.cancellationEffectiveAt).toEqual(d(2017, 2, 28));
    expect(result.autoRenewed).toBe(false);
  });

  it("Randfall: Kündigung genau am letztmöglichen Tag gilt noch als rechtzeitig", () => {
    const result = calculateContractCancellation({
      ...base,
      cancellationReceivedAt: d(2016, 9, 30),
    });
    expect(result.autoRenewed).toBe(false);
    expect(result.cancellationEffectiveAt).toEqual(d(2016, 12, 31));
  });

  it("Randfall: Jahreswechsel bei der aut. Verlängerung wird korrekt behandelt", () => {
    const result = calculateContractCancellation({
      joinedAt: d(2020, 10, 1),
      termMonths: 3, // Vertragsende 2020-12-31 (3 Monate ab Beitritt, letzter Tag)
      autoRenewalMonths: 1,
      noticePeriodMonths: 1,
      cancellationReceivedAt: d(2020, 12, 15), // nach dem 30-11-2020 (possibleUntil)
    });
    expect(result.contractEndDate).toEqual(d(2020, 12, 31));
    expect(result.cancellationPossibleUntil).toEqual(d(2020, 11, 30));
    expect(result.autoRenewed).toBe(true);
    expect(result.cancellationEffectiveAt).toEqual(d(2021, 1, 31));
  });
});
