"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withGymScope } from "@/lib/scoped-prisma";
import { checkPermission } from "@/lib/permissions";
import { getCurrentEmployee } from "@/lib/dal";
import {
  ContractTypeEnum,
  CustomerStatusEnum,
  DebitOptionEnum,
  GenderEnum,
} from "@/lib/enums";
import { eurosToCents } from "@/lib/money";
import { calculateContractCancellation } from "@/lib/core/cancellation";
import { addMonths } from "date-fns";

export type ActionState = { error: string } | undefined;

const PersonSchema = z
  .object({
    firstName: z.string().min(1, { error: "Vorname ist erforderlich." }),
    lastName: z.string().min(1, { error: "Nachname ist erforderlich." }),
    gender: GenderEnum,
    birthday: z.coerce.date({ error: "Bitte ein gültiges Geburtsdatum angeben." }),
    street: z.string().optional(),
    houseNumber: z.string().optional(),
    zip: z.string().optional(),
    city: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    notes: z.string().optional(),
    // Standort ist Mehrfachauswahl statt Einzelwert - allLocations=true
    // bedeutet "alle Standorte inkl. zukuenftiger", locationIds nur relevant
    // wenn allLocations=false (siehe LocationMultiSelect-Komponente).
    allLocations: z.string().transform((v) => v === "true"),
    locationIds: z.array(z.string()),
    joinedAt: z.coerce.date({ error: "Bitte ein gültiges Eintrittsdatum angeben." }),
    contractType: ContractTypeEnum,
  })
  .refine((data) => data.allLocations || data.locationIds.length > 0, {
    error: "Bitte mindestens einen Standort wählen oder \"Alle Standorte\".",
    path: ["locationIds"],
  });

export async function createCustomer(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCustomers");
  if (permError) return permError;

  const validated = PersonSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    gender: formData.get("gender"),
    birthday: formData.get("birthday"),
    street: formData.get("street") || undefined,
    houseNumber: formData.get("houseNumber") || undefined,
    zip: formData.get("zip") || undefined,
    city: formData.get("city") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    mobile: formData.get("mobile") || undefined,
    allLocations: formData.get("allLocations"),
    locationIds: formData.getAll("locationIds"),
    joinedAt: formData.get("joinedAt"),
    contractType: formData.get("contractType"),
  });

  if (!validated.success) {
    return { error: "Bitte alle Pflichtfelder prüfen." };
  }

  const { contractType, allLocations, locationIds, ...rest } = validated.data;
  const { gymId } = await getCurrentEmployee();

  let customerId: string | undefined;

  const result = await withGymScope(gymId, async (db) => {
    const customer = await db.customer.create({
      data: {
        ...rest,
        gymId,
        contractType,
        status: "ACTIVE",
        allLocations,
        locations: allLocations ? undefined : { connect: locationIds.map((id) => ({ id })) },
      },
    });
    customerId = customer.id;

    if (contractType === "CONTRACT") {
      const settings = await db.settings.findUnique({ where: { gymId } });
      const noticePeriodMonths = settings?.defaultNoticePeriodMonths ?? 3;
      const autoRenewalMonths = settings?.defaultAutoRenewalMonths ?? 3;
      const termMonths = 12;
      const defaultPlan = await db.contractPlan.findFirst({ orderBy: { createdAt: "asc" } });
      if (!defaultPlan) {
        return { error: "Bitte zuerst unter Vertragsarten eine Vertragsart anlegen." };
      }
      const calc = calculateContractCancellation({
        joinedAt: rest.joinedAt,
        termMonths,
        autoRenewalMonths,
        noticePeriodMonths,
      });
      await db.contractDetail.create({
        data: {
          gymId,
          customerId: customer.id,
          planId: defaultPlan.id,
          termMonths,
          autoRenewalMonths,
          noticePeriodMonths,
          feeCents: 0,
          debitOption: "MONTHLY",
          contractEndDate: calc.contractEndDate,
          cancellationPossibleUntil: calc.cancellationPossibleUntil,
          cancellationEffectiveAt: calc.cancellationEffectiveAt,
          autoRenewed: calc.autoRenewed,
        },
      });
    }
    return undefined;
  });

  if (result?.error) return result;

  revalidatePath("/customers");
  redirect(`/customers/${customerId}`);
}

export async function updateCustomerPerson(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCustomers");
  if (permError) return permError;

  const validated = PersonSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    gender: formData.get("gender"),
    birthday: formData.get("birthday"),
    street: formData.get("street") || undefined,
    houseNumber: formData.get("houseNumber") || undefined,
    zip: formData.get("zip") || undefined,
    city: formData.get("city") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    mobile: formData.get("mobile") || undefined,
    notes: formData.get("notes") || undefined,
    allLocations: formData.get("allLocations"),
    locationIds: formData.getAll("locationIds"),
    joinedAt: formData.get("joinedAt"),
    contractType: formData.get("contractType"),
  });

  if (!validated.success) {
    return { error: "Bitte alle Pflichtfelder prüfen." };
  }

  const { allLocations, locationIds, ...rest } = validated.data;
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.customer.update({
      where: { id },
      data: {
        ...rest,
        allLocations,
        locations: { set: allLocations ? [] : locationIds.map((id) => ({ id })) },
      },
    }),
  );
  revalidatePath(`/customers/${id}`);
}

export async function updateCustomerPhoto(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCustomers");
  if (permError) return permError;
  const photoUrl = formData.get("photoUrl");
  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.customer.update({
      where: { id },
      data: { photoUrl: typeof photoUrl === "string" && photoUrl ? photoUrl : null },
    }),
  );
  revalidatePath(`/customers/${id}`);
  return undefined;
}

const BankSchema = z.object({
  bankName: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  directDebitAuthorized: z.coerce.boolean().optional(),
});

export async function updateCustomerBank(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCustomers");
  if (permError) return permError;

  const validated = BankSchema.safeParse({
    bankName: formData.get("bankName") || undefined,
    iban: formData.get("iban") || undefined,
    bic: formData.get("bic") || undefined,
    directDebitAuthorized: formData.get("directDebitAuthorized") === "on",
  });

  if (!validated.success) {
    return { error: "Bitte die Bankdaten prüfen." };
  }

  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.customerBankAccount.upsert({
      where: { customerId: id },
      create: { gymId, customerId: id, ...validated.data },
      update: validated.data,
    }),
  );
  revalidatePath(`/customers/${id}`);
}

const ContractSchema = z.object({
  status: CustomerStatusEnum,
  planId: z.string().min(1, { error: "Bitte eine Vertragsart wählen." }),
  termMonths: z.coerce.number().int().min(1),
  autoRenewalMonths: z.coerce.number().int().min(0),
  noticePeriodMonths: z.coerce.number().int().min(0),
  feeEuros: z.coerce.number().min(0),
  debitOption: DebitOptionEnum,
  pausedFrom: z.coerce.date().optional().nullable(),
  pausedTo: z.coerce.date().optional().nullable(),
  cancellationReceivedAt: z.coerce.date().optional().nullable(),
});

export async function updateCustomerContract(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCustomers");
  if (permError) return permError;

  const raw = {
    status: formData.get("status"),
    planId: formData.get("planId"),
    termMonths: formData.get("termMonths"),
    autoRenewalMonths: formData.get("autoRenewalMonths"),
    noticePeriodMonths: formData.get("noticePeriodMonths"),
    feeEuros: formData.get("feeEuros"),
    debitOption: formData.get("debitOption"),
    pausedFrom: formData.get("pausedFrom") || null,
    pausedTo: formData.get("pausedTo") || null,
    cancellationReceivedAt: formData.get("cancellationReceivedAt") || null,
  };

  const validated = ContractSchema.safeParse(raw);
  if (!validated.success) {
    return { error: "Bitte die Vertragsdetails prüfen." };
  }

  const {
    status,
    planId,
    termMonths,
    autoRenewalMonths,
    noticePeriodMonths,
    feeEuros,
    debitOption,
    pausedFrom,
    pausedTo,
    cancellationReceivedAt,
  } = validated.data;

  const { gymId } = await getCurrentEmployee();

  const result = await withGymScope(gymId, async (db) => {
    const customer = await db.customer.findUnique({ where: { id } });
    if (!customer) return { error: "Kunde nicht gefunden." };

    const calc = calculateContractCancellation({
      joinedAt: customer.joinedAt,
      termMonths,
      autoRenewalMonths,
      noticePeriodMonths,
      pausedFrom,
      pausedTo,
      cancellationReceivedAt,
    });

    await db.customer.update({ where: { id }, data: { status } });
    await db.contractDetail.upsert({
      where: { customerId: id },
      create: {
        gymId,
        customerId: id,
        planId,
        termMonths,
        autoRenewalMonths,
        noticePeriodMonths,
        feeCents: eurosToCents(feeEuros),
        debitOption,
        pausedFrom,
        pausedTo,
        cancellationReceivedAt,
        contractEndDate: calc.contractEndDate,
        cancellationPossibleUntil: calc.cancellationPossibleUntil,
        cancellationEffectiveAt: calc.cancellationEffectiveAt,
        autoRenewed: calc.autoRenewed,
      },
      update: {
        planId,
        termMonths,
        autoRenewalMonths,
        noticePeriodMonths,
        feeCents: eurosToCents(feeEuros),
        debitOption,
        pausedFrom,
        pausedTo,
        cancellationReceivedAt,
        contractEndDate: calc.contractEndDate,
        cancellationPossibleUntil: calc.cancellationPossibleUntil,
        cancellationEffectiveAt: calc.cancellationEffectiveAt,
        autoRenewed: calc.autoRenewed,
      },
    });
    return undefined;
  });

  if (result?.error) return result;

  revalidatePath(`/customers/${id}`);
}

export async function updateCustomerVoucher(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permCustomers");
  if (permError) return permError;

  const voucherTypeId = formData.get("voucherTypeId");
  if (typeof voucherTypeId !== "string" || !voucherTypeId) {
    return { error: "Bitte einen Gutschein wählen." };
  }

  const { gymId } = await getCurrentEmployee();

  const result = await withGymScope(gymId, async (db) => {
    const voucherType = await db.voucherType.findUnique({ where: { id: voucherTypeId } });
    if (!voucherType) return { error: "Gutschein nicht gefunden." };

    const assignedAt = new Date();
    const validUntil = addMonths(assignedAt, voucherType.validityMonths);

    await db.voucherAssignment.upsert({
      where: { customerId: id },
      create: {
        gymId,
        customerId: id,
        voucherTypeId,
        assignedAt,
        validUntil,
        remainingSessions: voucherType.sessionCount,
      },
      update: {
        voucherTypeId,
        assignedAt,
        validUntil,
        remainingSessions: voucherType.sessionCount,
      },
    });
    return undefined;
  });

  if (result?.error) return result;

  revalidatePath(`/customers/${id}`);
}

export async function deleteCustomers(
  ids: string[],
): Promise<{ error?: string }> {
  const permError = await checkPermission("permCustomers");
  if (permError) return permError;

  const { gymId } = await getCurrentEmployee();

  const notInactive = await withGymScope(gymId, (db) =>
    db.customer.findMany({
      where: { id: { in: ids }, status: { not: "INACTIVE" } },
      select: { firstName: true, lastName: true },
    }),
  );

  if (notInactive.length > 0) {
    const names = notInactive.map((c) => `${c.firstName} ${c.lastName}`).join(", ");
    return {
      error: `Es können nur Kunden mit Status "Inaktiv" gelöscht werden: ${names}`,
    };
  }

  await withGymScope(gymId, (db) => db.customer.deleteMany({ where: { id: { in: ids } } }));
  revalidatePath("/customers");
  return {};
}
