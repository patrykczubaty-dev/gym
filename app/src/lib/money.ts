// Geldbeträge werden in der DB als Int in Cent gespeichert (kein Float),
// um Rundungsfehler auszuschliessen.

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function centsToEuros(cents: number): number {
  return cents / 100;
}

export function formatCents(cents: number): string {
  return centsToEuros(cents).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}
