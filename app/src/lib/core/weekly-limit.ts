// Wochenlimit einer Vertragsart (ContractPlan.weeklyLimit, siehe schema.prisma):
// null bedeutet Flatrate (unbegrenzt), sonst maximale Anzahl Kursbuchungen
// pro Kalenderwoche (Mo-So). Nur BOOKED zaehlt gegen das Limit - ein
// Wartelistenplatz belegt keinen tatsaechlichen Kursplatz.
export function isWithinWeeklyLimit(
  bookedThisWeek: number,
  weeklyLimit: number | null,
): boolean {
  if (weeklyLimit === null) return true;
  return bookedThisWeek < weeklyLimit;
}
