// Warteliste-Nachrück-Logik (siehe gymproject.md, Abschnitt Kalender):
// Wer auf Wartelistenplatz N steht, braucht N frei werdende Plätze, bevor
// er automatisch dem Kurs hinzugefügt wird (Platz 1 braucht 1 frei
// werdenden Platz, Platz 2 braucht 2, usw.).

export interface WaitlistEntry {
  waitlistPosition: number;
}

export function resolveWaitlistPromotion<T extends WaitlistEntry>(
  waitlist: T[],
  freedSpots: number,
): { promoted: T[]; remaining: T[] } {
  const sorted = [...waitlist].sort(
    (a, b) => a.waitlistPosition - b.waitlistPosition,
  );

  const promoted = sorted.filter((e) => e.waitlistPosition <= freedSpots);
  const remaining = sorted
    .filter((e) => e.waitlistPosition > freedSpots)
    .map((e, index) => ({ ...e, waitlistPosition: index + 1 }));

  return { promoted, remaining };
}
