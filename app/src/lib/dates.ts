// Formatiert ein Date für <input type="date"> (yyyy-MM-dd, lokale Zeit).
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Einheitliches Anzeigeformat auf der gesamten Seite: DD.MM.YYYY.
export function formatDateDe(date: Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatTimeDe(date: Date): string {
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// Events koennen (im Unterschied zu Kursterminen) mehrtägig sein - zeigt bei
// gleichem Kalendertag das gewohnte "DD.MM.YYYY, HH:MM–HH:MM Uhr", sonst
// explizit Start- UND Enddatum.
export function formatEventRange(startsAt: Date, endsAt: Date): string {
  const sameDay = toDateInputValue(startsAt) === toDateInputValue(endsAt);
  if (sameDay) {
    return `${formatDateDe(startsAt)}, ${formatTimeDe(startsAt)}–${formatTimeDe(endsAt)} Uhr`;
  }
  return `${formatDateDe(startsAt)} ${formatTimeDe(startsAt)} Uhr – ${formatDateDe(endsAt)} ${formatTimeDe(endsAt)} Uhr`;
}
