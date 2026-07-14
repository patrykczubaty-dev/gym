// Berechnet alle Kalendertage eines Wochentags innerhalb eines Zeitraums
// (für wöchentlich wiederkehrende Kurstermine). dayOfWeek folgt der
// JS-Konvention: 0 = Sonntag ... 6 = Samstag.
export function getWeeklyOccurrences(input: {
  dayOfWeek: number;
  from: Date;
  to: Date;
}): Date[] {
  const start = new Date(input.from.getFullYear(), input.from.getMonth(), input.from.getDate());
  const end = new Date(input.to.getFullYear(), input.to.getMonth(), input.to.getDate());
  if (start > end) return [];

  const offset = (input.dayOfWeek - start.getDay() + 7) % 7;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + offset);

  const occurrences: Date[] = [];
  while (cursor <= end) {
    occurrences.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return occurrences;
}
