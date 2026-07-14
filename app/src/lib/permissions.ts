import type { PermissionKey } from "@/lib/enums";
import { getCurrentEmployee, type CurrentEmployee } from "@/lib/dal";
import { PERMISSION_LABELS } from "@/lib/enums";

// permAdmin übertrumpft/beinhaltet alle anderen Berechtigungen (siehe
// gymproject.md, Abschnitt Mitarbeiter/Berechtigungen).
export function hasPermission(
  employee: Pick<CurrentEmployee, PermissionKey>,
  key: PermissionKey,
): boolean {
  return employee.permAdmin || employee[key];
}

export function requirePermission(
  employee: Pick<CurrentEmployee, PermissionKey>,
  key: PermissionKey,
): void {
  if (!hasPermission(employee, key)) {
    throw new Error("Nicht berechtigt");
  }
}

// Für Server Actions: lädt den aktuellen Mitarbeiter und gibt bei fehlender
// Berechtigung ein Fehlerobjekt zurück (statt zu werfen), damit der Aufrufer
// es direkt als ActionState zurückgeben kann.
export async function checkPermission(
  key: PermissionKey,
): Promise<{ error: string } | null> {
  const employee = await getCurrentEmployee();
  if (!hasPermission(employee, key)) {
    return { error: `Fehlende Berechtigung: ${PERMISSION_LABELS[key]}.` };
  }
  return null;
}
