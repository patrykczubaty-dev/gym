import type { OccupancyStatus } from "@/lib/enums";

// Ampel-Logik für Kalender-Termine (siehe gymproject.md, Abschnitt Kalender):
// grün = weniger als 80% der Plätze belegt, gelb = nur noch 20% (oder
// weniger) frei, rot = alle Plätze belegt (-> Warteliste).
export function getOccupancyStatus(
  bookedCount: number,
  capacity: number,
): OccupancyStatus {
  if (capacity <= 0 || bookedCount >= capacity) return "red";
  const ratio = bookedCount / capacity;
  if (ratio < 0.8) return "green";
  return "yellow";
}
