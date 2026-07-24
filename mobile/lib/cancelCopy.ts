import type { WeeklyQuota } from "./types";

// Reine Funktion (kein React) - macht dem Nutzer VOR dem Bestaetigen
// erkennbar, was das Stornieren konkret bewirkt (Kontingent wieder frei,
// bis wann kostenlos), statt nur "Sicher?" zu fragen (UI/UX-Review).
export function buildCancelConsequence(
  status: "BOOKED" | "WAITLISTED",
  weeklyQuota: WeeklyQuota,
  cancellationCutoffHours: number | null,
  startsAt: string,
): string {
  if (status === "WAITLISTED") {
    return "Dein Platz auf der Warteliste geht verloren.";
  }

  const parts: string[] = [];

  if (weeklyQuota) {
    // Wartelistenplaetze zaehlen nicht gegen das Kontingent (siehe
    // api/mobile/bookings POST) - eine BOOKED-Stornierung macht also genau
    // einen Platz wieder frei.
    const remaining = Math.max(0, weeklyQuota.usedThisWeek - 1);
    parts.push(`Dein Wochenkontingent wird wieder frei (${remaining}/${weeklyQuota.limit}).`);
  }

  if (cancellationCutoffHours !== null) {
    const cutoff = new Date(new Date(startsAt).getTime() - cancellationCutoffHours * 60 * 60 * 1000);
    const cutoffLabel = cutoff.toLocaleString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    parts.push(`Bis ${cutoffLabel} kostenlos - danach zählt der Kurs als besucht.`);
  } else {
    parts.push("Jederzeit kostenlos stornierbar.");
  }

  return parts.join(" ");
}
