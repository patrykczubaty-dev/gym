"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";
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

const PersonSchema = z.object({
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
  locationId: z.string().min(1, { error: "Bitte einen Standort wählen." }),
  joinedAt: z.coerce.date({ error: "Bitte ein gültiges Eintrittsdatum angeben." }),
  contractType: ContractTypeEnum,
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
    locationId: formData.get("locationId"),
    joinedAt: formData.get("joinedAt"),
    contractType: formData.get("contractType"),
  });

  if (!validated.success) {
    return { error: "Bitte alle Pflichtfelder prüfen." };
  }

  const { contractType, ...rest } = validated.data;

  const customer = await prisma.customer.create({
    data: { ...rest, contractType, status: "ACTIVE" },
  });

  if (contractType === "CONTRACT") {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const noticePeriodMonths = settings?.defaultNoticePeriodMonths ?? 3;
    const autoRenewalMonths = settings?.defaultAutoRenewalMonths ?? 3;
    const termMonths = 12;
    const defaultPlan = await prisma.contractPlan.findFirst({ orderBy: { createdAt: "asc" } });
    if (!defaultPlan) {
      return { error: "Bitte zuerst unter Vertragsarten eine Vertragsart anlegen." };
    }
    const calc = calculateContractCancellation({
      joinedAt: rest.joinedAt,
      termMonths,
      autoRenewalMonths,
      noticePeriodMonths,
    });
    await prisma.contractDetail.create({
      data: {
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

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
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
    locationId: formData.get("locationId"),
    joinedAt: formData.get("joinedAt"),
    contractType: formData.get("contractType"),
  });

  if (!validated.success) {
    return { error: "Bitte alle Pflichtfelder prüfen." };
  }

  await prisma.customer.update({ where: { id }, data: validated.data });
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
  await prisma.customer.update({
    where: { id },
    data: { photoUrl: typeof photoUrl === "string" && photoUrl ? photoUrl : null },
  });
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

  await prisma.customerBankAccount.upsert({
    where: { customerId: id },
    create: { customerId: id, ...validated.data },
    update: validated.data,
  });
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

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return { error: "Kunde nicht gefunden." };

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

  const calc = calculateContractCancellation({
    joinedAt: customer.joinedAt,
    termMonths,
    autoRenewalMonths,
    noticePeriodMonths,
    pausedFrom,
    pausedTo,
    cancellationReceivedAt,
  });

  await prisma.$transaction([
    prisma.customer.update({ where: { id }, data: { status } }),
    prisma.contractDetail.upsert({
      where: { customerId: id },
      create: {
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
    }),
  ]);

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

  const voucherType = await prisma.voucherType.findUnique({
    where: { id: voucherTypeId },
  });
  if (!voucherType) return { error: "Gutschein nicht gefunden." };

  const assignedAt = new Date();
  const validUntil = addMonths(assignedAt, voucherType.validityMonths);

  await prisma.voucherAssignment.upsert({
    where: { customerId: id },
    create: {
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

  revalidatePath(`/customers/${id}`);
}

export async function deleteCustomers(
  ids: string[],
): Promise<{ error?: string }> {
  const permError = await checkPermission("permCustomers");
  if (permError) return permError;

  const notInactive = await prisma.customer.findMany({
    where: { id: { in: ids }, status: { not: "INACTIVE" } },
    select: { firstName: true, lastName: true },
  });

  if (notInactive.length > 0) {
    const names = notInactive.map((c) => `${c.firstName} ${c.lastName}`).join(", ");
    return {
      error: `Es können nur Kunden mit Status "Inaktiv" gelöscht werden: ${names}`,
    };
  }

  await prisma.customer.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/customers");
  return {};
}
