import { z } from "zod";

// SQLite kennt keine nativen Enums, daher werden alle Enum-Spalten im Prisma-Schema
// als String modelliert. Diese zod-Enums sind die verbindliche Definition der
// erlaubten Werte und werden bei jedem Schreibzugriff validiert.

export const GenderEnum = z.enum(["w", "m"]);
export type Gender = z.infer<typeof GenderEnum>;

export const GENDER_LABELS: Record<Gender, string> = {
  w: "weiblich",
  m: "männlich",
};

export const CustomerStatusEnum = z.enum(["ACTIVE", "PAUSED", "INACTIVE"]);
export type CustomerStatus = z.infer<typeof CustomerStatusEnum>;

export const ContractTypeEnum = z.enum(["VOUCHER", "CONTRACT", "TRIAL"]);
export type ContractType = z.infer<typeof ContractTypeEnum>;

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  CONTRACT: "Vertrag",
  VOUCHER: "Gutschein",
  TRIAL: "Probetraining",
};

export const DebitOptionEnum = z.enum(["MONTHLY", "WEEKLY"]);
export type DebitOption = z.infer<typeof DebitOptionEnum>;

export const PaymentScheduleEnum = z.enum([
  "FIRST_OF_MONTH",
  "FIFTEENTH_OF_MONTH",
]);
export type PaymentSchedule = z.infer<typeof PaymentScheduleEnum>;

export const PaymentStatusEnum = z.enum(["OPEN", "DONE"]);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const TrialStatusEnum = z.enum([
  "OPEN",
  "PROPOSED",
  "ACCEPTED",
  "DECLINED",
]);
export type TrialStatus = z.infer<typeof TrialStatusEnum>;

export const TrialSlotResponseEnum = z.enum([
  "PENDING",
  "ACCEPTED",
  "DECLINED",
]);
export type TrialSlotResponse = z.infer<typeof TrialSlotResponseEnum>;

export const BookingStatusEnum = z.enum(["BOOKED", "WAITLISTED", "CANCELLED"]);
export type BookingStatus = z.infer<typeof BookingStatusEnum>;

export const NewsStatusEnum = z.enum(["SENT", "DRAFT", "ARCHIVED"]);
export type NewsStatus = z.infer<typeof NewsStatusEnum>;

export const EmailTemplateCategoryEnum = z.enum([
  "PERSON",
  "CALENDAR",
  "BILLING",
]);
export type EmailTemplateCategory = z.infer<typeof EmailTemplateCategoryEnum>;

export const OccupancyStatusEnum = z.enum(["green", "yellow", "red"]);
export type OccupancyStatus = z.infer<typeof OccupancyStatusEnum>;

export const PERMISSION_KEYS = [
  "permAdmin",
  "permCalendar",
  "permTrials",
  "permVouchers",
  "permEmployees",
  "permCustomers",
  "permSepa",
  "permEmailTemplates",
  "permNews",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  permAdmin: "Administrator",
  permCalendar: "Kalender Verwaltung",
  permTrials: "Probetraining Verwaltung",
  permVouchers: "Gutscheine Verwaltung",
  permEmployees: "Mitarbeiter Verwaltung",
  permCustomers: "Kunden Verwaltung",
  permSepa: "SEPA Übersicht",
  permEmailTemplates: "E-Mail Texte Verwaltung",
  permNews: "News Verwaltung",
};
