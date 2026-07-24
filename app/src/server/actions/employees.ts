"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withGymScope } from "@/lib/scoped-prisma";
import { checkPermission } from "@/lib/permissions";
import { getCurrentEmployee } from "@/lib/dal";
import { GenderEnum, PaymentScheduleEnum, PERMISSION_KEYS } from "@/lib/enums";
import { eurosToCents } from "@/lib/money";

export type ActionState = { error: string } | undefined;

const PersonSchema = z.object({
  firstName: z.string().min(1, { error: "Vorname ist erforderlich." }),
  lastName: z.string().min(1, { error: "Nachname ist erforderlich." }),
  gender: GenderEnum,
  birthday: z.coerce.date({ error: "Bitte ein gültiges Geburtsdatum angeben." }),
  employeeSince: z.coerce.date({ error: "Bitte ein gültiges Datum angeben." }),
  // Mehrfachauswahl statt Einzel-Standort (analog zu Customer), siehe
  // LocationMultiSelect-Komponente.
  locationIds: z.array(z.string()).min(1, { error: "Bitte mindestens einen Standort wählen." }),
  street: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  email: z.email({ error: "Bitte eine gültige E-Mail-Adresse angeben." }),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  notes: z.string().optional(),
});

export async function createEmployee(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permEmployees");
  if (permError) return permError;

  const validated = PersonSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    gender: formData.get("gender"),
    birthday: formData.get("birthday"),
    employeeSince: formData.get("employeeSince"),
    locationIds: formData.getAll("locationIds"),
    street: formData.get("street") || undefined,
    zip: formData.get("zip") || undefined,
    city: formData.get("city") || undefined,
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    mobile: formData.get("mobile") || undefined,
  });

  const password = formData.get("password");
  if (typeof password !== "string" || password.length < 6) {
    return { error: "Das Passwort muss mindestens 6 Zeichen lang sein." };
  }

  if (!validated.success) {
    return { error: "Bitte alle Pflichtfelder prüfen." };
  }

  const { gymId } = await getCurrentEmployee();

  const existing = await withGymScope(gymId, (db) =>
    db.employee.findUnique({ where: { email: validated.data.email } }),
  );
  if (existing) {
    return { error: "Ein Mitarbeiter mit dieser E-Mail existiert bereits." };
  }

  const { locationIds, ...rest } = validated.data;

  const employee = await withGymScope(gymId, (db) =>
    db.employee.create({
      data: {
        ...rest,
        gymId,
        passwordHash: bcrypt.hashSync(password, 10),
        locations: { connect: locationIds.map((id) => ({ id })) },
      },
    }),
  );

  revalidatePath("/employees");
  redirect(`/employees/${employee.id}`);
}

export async function updateEmployeePerson(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permEmployees");
  if (permError) return permError;

  const validated = PersonSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    gender: formData.get("gender"),
    birthday: formData.get("birthday"),
    employeeSince: formData.get("employeeSince"),
    locationIds: formData.getAll("locationIds"),
    street: formData.get("street") || undefined,
    zip: formData.get("zip") || undefined,
    city: formData.get("city") || undefined,
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    mobile: formData.get("mobile") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!validated.success) {
    return { error: "Bitte alle Pflichtfelder prüfen." };
  }

  const { locationIds, ...rest } = validated.data;
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.employee.update({
      where: { id },
      data: { ...rest, locations: { set: locationIds.map((locId) => ({ id: locId })) } },
    }),
  );
  revalidatePath(`/employees/${id}`);
}

export async function updateEmployeePhoto(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permEmployees");
  if (permError) return permError;
  const photoUrl = formData.get("photoUrl");
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.employee.update({
      where: { id },
      data: { photoUrl: typeof photoUrl === "string" && photoUrl ? photoUrl : null },
    }),
  );
  revalidatePath(`/employees/${id}`);
  return undefined;
}

const BankSchema = z.object({
  bankName: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  salaryEuros: z.string().optional(),
  paymentSchedule: PaymentScheduleEnum.optional(),
});

export async function updateEmployeeBank(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permEmployees");
  if (permError) return permError;

  const validated = BankSchema.safeParse({
    bankName: formData.get("bankName") || undefined,
    iban: formData.get("iban") || undefined,
    bic: formData.get("bic") || undefined,
    salaryEuros: formData.get("salaryEuros") || undefined,
    paymentSchedule: formData.get("paymentSchedule") || undefined,
  });

  if (!validated.success) {
    return { error: "Bitte die Bankdaten prüfen." };
  }

  const { salaryEuros, ...rest } = validated.data;

  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.employee.update({
      where: { id },
      data: {
        ...rest,
        salaryCents: salaryEuros ? eurosToCents(Number(salaryEuros)) : null,
      },
    }),
  );
  revalidatePath(`/employees/${id}`);
}

export async function updateEmployeePermissions(
  id: string,
  formData: FormData,
): Promise<void> {
  const permError = await checkPermission("permAdmin");
  if (permError) return;

  const data = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, formData.get(key) === "on"]),
  );

  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) => db.employee.update({ where: { id }, data }));
  revalidatePath(`/employees/${id}`);
}

export async function deleteEmployees(
  ids: string[],
): Promise<{ error?: string }> {
  const permError = await checkPermission("permEmployees");
  if (permError) return permError;

  const { gymId } = await getCurrentEmployee();

  const withCourses = await withGymScope(gymId, (db) =>
    db.employee.findMany({
      where: { id: { in: ids }, leadCourses: { some: {} } },
      select: { firstName: true, lastName: true },
    }),
  );

  if (withCourses.length > 0) {
    const names = withCourses.map((e) => `${e.firstName} ${e.lastName}`).join(", ");
    return {
      error: `Mitarbeiter mit zugeteilten Kursen können nicht gelöscht werden: ${names}`,
    };
  }

  await withGymScope(gymId, (db) => db.employee.deleteMany({ where: { id: { in: ids } } }));
  revalidatePath("/employees");
  return {};
}
