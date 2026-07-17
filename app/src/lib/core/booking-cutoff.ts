// Ob ein Mitglied eine Buchung ueber die App noch stornieren darf, ohne dass
// es als Nichterscheinen zaehlt - pro Kurs konfigurierbar (Course.
// cancellationCutoffHours), siehe Quiz-Entscheidung zur Mobile App.
export function canCancelBooking(
  startsAt: Date,
  cutoffHours: number | null,
  now: Date = new Date(),
): boolean {
  if (cutoffHours === null) return true;
  const hoursUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilStart >= cutoffHours;
}
