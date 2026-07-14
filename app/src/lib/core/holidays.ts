// Berechnet die bundesweiten deutschen Feiertage rein aus dem Kalenderjahr
// (keine externe Feiertags-API nötig). Ostersonntag wird nach der
// Gauss'schen Osterformel bestimmt, alle beweglichen Feiertage leiten sich
// per Tagesversatz davon ab. Nur bundesweit einheitliche Feiertage sind
// enthalten - Bundesland-spezifische Feiertage (z.B. Fronleichnam,
// Reformationstag) sind bewusst nicht Teil dieses ersten Entwurfs.

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// Gauss'sche Osterformel: liefert das Datum des Ostersonntags für ein Jahr.
function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = März, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getGermanPublicHolidays(year: number): Date[] {
  const easterSunday = calculateEasterSunday(year);

  return [
    new Date(year, 0, 1), // Neujahr
    addDays(easterSunday, -2), // Karfreitag
    addDays(easterSunday, 1), // Ostermontag
    new Date(year, 4, 1), // Tag der Arbeit
    addDays(easterSunday, 39), // Christi Himmelfahrt
    addDays(easterSunday, 50), // Pfingstmontag
    new Date(year, 9, 3), // Tag der Deutschen Einheit
    new Date(year, 11, 25), // 1. Weihnachtsfeiertag
    new Date(year, 11, 26), // 2. Weihnachtsfeiertag
  ];
}

export function isGermanPublicHoliday(date: Date): boolean {
  const key = toDateKey(date);
  return getGermanPublicHolidays(date.getFullYear()).some((h) => toDateKey(h) === key);
}
