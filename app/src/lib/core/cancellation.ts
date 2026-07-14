import { addDays, addMonths, differenceInCalendarMonths } from "date-fns";

// Reine, DB-/Framework-unabhängige Funktion für die Kündigungs-/
// Verlängerungslogik von Langzeitverträgen (siehe gymproject.md, Abschnitt
// "Kündigung/Verlängerung"). Die Formeln sind gegen die dort dokumentierten
// drei Beispielrechnungen verifiziert (siehe cancellation.test.ts).
//
// Kernregeln:
// - Vertragsende = Beigetreten + Laufzeit, minus 1 Tag (12 Monate ab
//   01-01-2016 laufen bis 31-12-2016, nicht bis 01-01-2017).
// - Kündigung möglich bis = Vertragsende minus Kündigungsfrist.
// - Eine Pause (Inaktiv von/bis) verschiebt sowohl Vertragsende als auch
//   "Kündigung möglich bis" um die Anzahl der pausierten Monate. Beide
//   Werte werden dabei unabhängig vom jeweiligen unverschobenen Ausgangsdatum
//   verschoben (nicht verkettet), da sonst die "Ende des Monats"-Eigenschaft
//   beim Verschieben verloren geht (siehe Testfall 3: Kündigung möglich bis
//   muss exakt der 30., nicht der 28./29. Tag des Monats sein).
// - Wird eine Kündigung eingereicht (Kündigung Eingang):
//   - vor/an "Kündigung möglich bis" -> Vertrag endet am (verschobenen)
//     Vertragsende, keine Verlängerung.
//   - danach (zu spät) -> Vertrag verlängert sich automatisch um die
//     "aut. Verlängerung"-Dauer.

export interface ContractCancellationInput {
  joinedAt: Date;
  termMonths: number;
  autoRenewalMonths: number;
  noticePeriodMonths: number;
  pausedFrom?: Date | null;
  pausedTo?: Date | null;
  cancellationReceivedAt?: Date | null;
}

export interface ContractCancellationResult {
  contractEndDate: Date;
  cancellationPossibleUntil: Date;
  cancellationEffectiveAt: Date;
  autoRenewed: boolean;
}

function pauseMonths(pausedFrom?: Date | null, pausedTo?: Date | null): number {
  if (!pausedFrom || !pausedTo) return 0;
  return differenceInCalendarMonths(pausedTo, pausedFrom) + 1;
}

export function calculateContractCancellation(
  input: ContractCancellationInput,
): ContractCancellationResult {
  const unshiftedEnd = addDays(addMonths(input.joinedAt, input.termMonths), -1);
  const unshiftedPossibleUntil = addMonths(
    unshiftedEnd,
    -input.noticePeriodMonths,
  );

  const shift = pauseMonths(input.pausedFrom, input.pausedTo);
  const contractEndDate = addMonths(unshiftedEnd, shift);
  const cancellationPossibleUntil = addMonths(unshiftedPossibleUntil, shift);

  const receivedAt = input.cancellationReceivedAt ?? null;
  const tooLate = receivedAt !== null && receivedAt > cancellationPossibleUntil;

  return {
    contractEndDate,
    cancellationPossibleUntil,
    cancellationEffectiveAt: tooLate
      ? addMonths(contractEndDate, input.autoRenewalMonths)
      : contractEndDate,
    autoRenewed: tooLate,
  };
}
