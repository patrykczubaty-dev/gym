import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { calculateContractCancellation } from "../src/lib/core/cancellation";

// Seeding umgeht bewusst RLS (legt Gyms + deren Erststamm-Daten uebergreifend
// an) und laeuft daher ueber den privilegierten DB-Owner, nicht ueber den
// eingeschraenkten Laufzeit-Benutzer.
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function hash(password: string) {
  return bcrypt.hashSync(password, 10);
}

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

async function main() {
  console.log("Seeding...");

  // --- Gym (Mandant) -----------------------------------------------------
  const gym = await prisma.gym.create({
    data: { name: "BEEPLUS Essen/Düsseldorf", slug: "beeplus-essen-duesseldorf" },
  });
  const gymId = gym.id;

  await prisma.settings.create({
    data: { gymId, defaultNoticePeriodMonths: 3, defaultAutoRenewalMonths: 3 },
  });

  // --- Standorte -----------------------------------------------------
  const essen = await prisma.location.create({
    data: { gymId, city: "Essen", street: "Kettwiger Str. 12", zip: "45127" },
  });
  const duesseldorf = await prisma.location.create({
    data: { gymId, city: "Düsseldorf", street: "Königsallee 40", zip: "40212" },
  });

  // --- Mitarbeiter -----------------------------------------------------
  const demoPassword = hash("training123");

  const admin = await prisma.employee.create({
    data: {
      gymId,
      firstName: "Sandra",
      lastName: "Beck",
      gender: "w",
      birthday: d(1985, 4, 12),
      employeeSince: d(2015, 3, 1),
      // Admin ist an beiden Standorten taetig - zeigt die Mehrfachauswahl
      // im Seed direkt an einem realistischen Beispiel.
      locations: { connect: [{ id: essen.id }, { id: duesseldorf.id }] },
      email: "admin@beeplus.de",
      passwordHash: hash("beeplus-admin"),
      phone: "0201 1234567",
      bankName: "Sparkasse Essen",
      iban: "DE02120300000000202051",
      bic: "BYLADEM1001",
      salaryCents: 420000,
      paymentSchedule: "FIRST_OF_MONTH",
      permAdmin: true,
    },
  });

  const studioleitung = await prisma.employee.create({
    data: {
      gymId,
      firstName: "Markus",
      lastName: "Vogel",
      gender: "m",
      birthday: d(1988, 11, 3),
      employeeSince: d(2018, 6, 1),
      locations: { connect: [{ id: essen.id }] },
      email: "markus.vogel@beeplus.de",
      passwordHash: demoPassword,
      phone: "0201 7654321",
      bankName: "Sparkasse Essen",
      iban: "DE45500105175407324931",
      bic: "INGDDEFFXXX",
      salaryCents: 320000,
      paymentSchedule: "FIRST_OF_MONTH",
      permCustomers: true,
      permEmployees: true,
      permCalendar: true,
      permTrials: true,
      permVouchers: true,
      permNews: true,
      permEmailTemplates: true,
      permSepa: true,
    },
  });

  const trainer = await prisma.employee.create({
    data: {
      gymId,
      firstName: "Julia",
      lastName: "Krüger",
      gender: "w",
      birthday: d(1993, 7, 22),
      employeeSince: d(2021, 2, 15),
      locations: { connect: [{ id: duesseldorf.id }] },
      email: "julia.krueger@beeplus.de",
      passwordHash: demoPassword,
      phone: "0211 9988776",
      bankName: "Deutsche Bank",
      iban: "DE12500105170648489890",
      bic: "DEUTDEDBFRA",
      salaryCents: 260000,
      paymentSchedule: "FIFTEENTH_OF_MONTH",
      permCalendar: true,
      permTrials: true,
    },
  });

  const rezeption = await prisma.employee.create({
    data: {
      gymId,
      firstName: "Tom",
      lastName: "Nowak",
      gender: "m",
      birthday: d(1997, 2, 9),
      employeeSince: d(2023, 9, 1),
      locations: { connect: [{ id: essen.id }] },
      email: "tom.nowak@beeplus.de",
      passwordHash: demoPassword,
      phone: "0201 5544332",
      permCustomers: true,
    },
  });

  const newsRedakteurin = await prisma.employee.create({
    data: {
      gymId,
      firstName: "Lena",
      lastName: "Schmidt",
      gender: "w",
      birthday: d(1991, 9, 30),
      employeeSince: d(2022, 4, 1),
      locations: { connect: [{ id: duesseldorf.id }] },
      email: "lena.schmidt@beeplus.de",
      passwordHash: demoPassword,
      phone: "0211 3322110",
      permNews: true,
      permEmailTemplates: true,
    },
  });

  for (const employee of [admin, studioleitung, trainer]) {
    if (!employee.salaryCents) continue;
    await prisma.employeePayout.createMany({
      data: [
        {
          gymId,
          employeeId: employee.id,
          amountCents: employee.salaryCents,
          date: d(2026, 6, 1),
          status: "DONE",
        },
        {
          gymId,
          employeeId: employee.id,
          amountCents: employee.salaryCents,
          date: d(2026, 7, 1),
          status: "OPEN",
        },
      ],
    });
  }

  // --- Kurse -----------------------------------------------------
  const yoga = await prisma.course.create({
    data: {
      gymId,
      title: "Yoga Flow",
      leadTrainerId: trainer.id,
      participantLimit: 12,
      trialPossible: true,
      trialDate: d(2026, 7, 20),
      locations: { connect: [{ id: essen.id }, { id: duesseldorf.id }] },
    },
  });
  const crossfit = await prisma.course.create({
    data: {
      gymId,
      title: "CrossFit Basics",
      leadTrainerId: studioleitung.id,
      participantLimit: 10,
      trialPossible: false,
      // Einziger Kurs mit Stornofrist im Seed - ohne mindestens einen Kurs
      // mit gesetzter Frist bleibt die "Stornofrist abgelaufen"-Regel
      // (canCancelBooking) in der Mobile App komplett ungetestet.
      cancellationCutoffHours: 24,
      locations: { connect: [{ id: essen.id }] },
    },
  });
  const ruecken = await prisma.course.create({
    data: {
      gymId,
      title: "Rückenfit",
      leadTrainerId: rezeption.id,
      participantLimit: 15,
      trialPossible: true,
      trialDate: d(2026, 7, 22),
      locations: { connect: [{ id: duesseldorf.id }] },
    },
  });
  const zumba = await prisma.course.create({
    data: {
      gymId,
      title: "Zumba",
      leadTrainerId: newsRedakteurin.id,
      participantLimit: 20,
      trialPossible: false,
      locations: { connect: [{ id: essen.id }, { id: duesseldorf.id }] },
    },
  });
  const bootcamp = await prisma.course.create({
    data: {
      gymId,
      title: "Bootcamp",
      leadTrainerId: trainer.id,
      participantLimit: 8,
      trialPossible: false,
      locations: { connect: [{ id: essen.id }] },
    },
  });
  const kickboxen = await prisma.course.create({
    data: {
      gymId,
      title: "Kickboxen",
      leadTrainerId: studioleitung.id,
      participantLimit: 14,
      trialPossible: true,
      locations: { connect: [{ id: essen.id }] },
    },
  });
  const pilates = await prisma.course.create({
    data: {
      gymId,
      title: "Pilates",
      leadTrainerId: trainer.id,
      participantLimit: 12,
      trialPossible: true,
      locations: { connect: [{ id: essen.id }, { id: duesseldorf.id }] },
    },
  });

  // --- Events -----------------------------------------------------
  const openDay = await prisma.event.create({
    data: {
      gymId,
      title: "Tag der offenen Tür",
      description: "Schnuppertraining, Studio-Führungen und Ernährungsberatung für alle.",
      participantLimit: 50,
      locations: { connect: [{ id: essen.id }, { id: duesseldorf.id }] },
    },
  });

  // --- Vertragsarten -----------------------------------------------------
  const planBasic = await prisma.contractPlan.create({
    data: { gymId, name: "Basic 2x/Woche", weeklyLimit: 2 },
  });
  const planPremium = await prisma.contractPlan.create({
    data: { gymId, name: "Premium 4x/Woche", weeklyLimit: 4 },
  });
  const planFlatrate = await prisma.contractPlan.create({
    data: { gymId, name: "Flatrate", weeklyLimit: null, notes: "Unbegrenzte Kursbesuche." },
  });

  // --- Kunden -----------------------------------------------------
  // Fall 1 (kuendigung_richtig.png): rechtzeitig gekündigt.
  const fall1Input = {
    joinedAt: d(2016, 1, 1),
    termMonths: 12,
    autoRenewalMonths: 3,
    noticePeriodMonths: 3,
    cancellationReceivedAt: d(2016, 9, 29),
  };
  const fall1 = calculateContractCancellation(fall1Input);

  // Fall 2 (kuendigung_falsch.png): einen Tag zu spät gekündigt.
  const fall2Input = {
    joinedAt: d(2016, 1, 1),
    termMonths: 12,
    autoRenewalMonths: 3,
    noticePeriodMonths: 3,
    cancellationReceivedAt: d(2016, 10, 1),
  };
  const fall2 = calculateContractCancellation(fall2Input);

  // Fall 3 (verlängerung.png): 2 Monate pausiert, keine Kündigung.
  const fall3Input = {
    joinedAt: d(2016, 1, 1),
    termMonths: 12,
    autoRenewalMonths: 3,
    noticePeriodMonths: 3,
    pausedFrom: d(2016, 3, 1),
    pausedTo: d(2016, 4, 30),
    cancellationReceivedAt: null,
  };
  const fall3 = calculateContractCancellation(fall3Input);

  const sabine = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Sabine",
      lastName: "Hoffmann",
      gender: "w",
      birthday: d(1990, 5, 14),
      street: "Rüttenscheider Str.",
      houseNumber: "88",
      zip: "45130",
      city: "Essen",
      email: "sabine.hoffmann@example.com",
      phone: "0201 1112233",
      status: "INACTIVE",
      contractType: "CONTRACT",
      // Trainiert an beiden Standorten - Testfall fuer Mehrfachauswahl.
      locations: { connect: [{ id: essen.id }, { id: duesseldorf.id }] },
      joinedAt: fall1Input.joinedAt,
      bankAccount: {
        create: {
          gymId,
          bankName: "Sparkasse Essen",
          iban: "DE89370400440532013000",
          bic: "COBADEFFXXX",
          directDebitAuthorized: true,
        },
      },
      contract: {
        create: {
          gymId,
          planId: planBasic.id,
          termMonths: fall1Input.termMonths,
          autoRenewalMonths: fall1Input.autoRenewalMonths,
          noticePeriodMonths: fall1Input.noticePeriodMonths,
          feeCents: 6500,
          debitOption: "MONTHLY",
          cancellationReceivedAt: fall1Input.cancellationReceivedAt,
          contractEndDate: fall1.contractEndDate,
          cancellationPossibleUntil: fall1.cancellationPossibleUntil,
          cancellationEffectiveAt: fall1.cancellationEffectiveAt,
          autoRenewed: fall1.autoRenewed,
        },
      },
      sepaDebits: {
        create: [
          { gymId, amountCents: 6500, bookingDate: d(2016, 11, 1), status: "DONE" },
          { gymId, amountCents: 6500, bookingDate: d(2016, 12, 1), status: "DONE" },
        ],
      },
    },
  });

  const ben = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Ben",
      lastName: "Fischer",
      gender: "m",
      birthday: d(1987, 2, 3),
      street: "Girardetstr.",
      houseNumber: "2",
      zip: "45131",
      city: "Essen",
      email: "ben.fischer@example.com",
      phone: "0201 2223344",
      status: "ACTIVE",
      contractType: "CONTRACT",
      locations: { connect: [{ id: essen.id }] },
      joinedAt: fall2Input.joinedAt,
      bankAccount: {
        create: {
          gymId,
          bankName: "Deutsche Bank",
          iban: "DE75512108001245126199",
          bic: "DEUTDEDBXXX",
          directDebitAuthorized: true,
        },
      },
      contract: {
        create: {
          gymId,
          planId: planBasic.id,
          termMonths: fall2Input.termMonths,
          autoRenewalMonths: fall2Input.autoRenewalMonths,
          noticePeriodMonths: fall2Input.noticePeriodMonths,
          feeCents: 6500,
          debitOption: "MONTHLY",
          cancellationReceivedAt: fall2Input.cancellationReceivedAt,
          contractEndDate: fall2.contractEndDate,
          cancellationPossibleUntil: fall2.cancellationPossibleUntil,
          cancellationEffectiveAt: fall2.cancellationEffectiveAt,
          autoRenewed: fall2.autoRenewed,
        },
      },
      sepaDebits: {
        create: [
          { gymId, amountCents: 6500, bookingDate: d(2016, 11, 1), status: "DONE" },
          { gymId, amountCents: 6500, bookingDate: d(2017, 1, 1), status: "OPEN" },
        ],
      },
    },
  });

  const nina = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Nina",
      lastName: "Krause",
      gender: "w",
      birthday: d(1995, 8, 19),
      street: "Königsallee",
      houseNumber: "10",
      zip: "40212",
      city: "Düsseldorf",
      email: "nina.krause@example.com",
      phone: "0211 3334455",
      status: "PAUSED",
      contractType: "CONTRACT",
      locations: { connect: [{ id: duesseldorf.id }] },
      joinedAt: fall3Input.joinedAt,
      bankAccount: {
        create: {
          gymId,
          bankName: "Postbank",
          iban: "DE02100100100006820101",
          bic: "PBNKDEFF",
          directDebitAuthorized: true,
        },
      },
      contract: {
        create: {
          gymId,
          planId: planPremium.id,
          termMonths: fall3Input.termMonths,
          autoRenewalMonths: fall3Input.autoRenewalMonths,
          noticePeriodMonths: fall3Input.noticePeriodMonths,
          feeCents: 6500,
          debitOption: "MONTHLY",
          pausedFrom: fall3Input.pausedFrom,
          pausedTo: fall3Input.pausedTo,
          contractEndDate: fall3.contractEndDate,
          cancellationPossibleUntil: fall3.cancellationPossibleUntil,
          cancellationEffectiveAt: fall3.cancellationEffectiveAt,
          autoRenewed: fall3.autoRenewed,
        },
      },
    },
  });

  const jonasInput = {
    joinedAt: d(2025, 9, 1),
    termMonths: 12,
    autoRenewalMonths: 3,
    noticePeriodMonths: 3,
    cancellationReceivedAt: null,
  };
  const jonasCalc = calculateContractCancellation(jonasInput);
  const jonas = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Jonas",
      lastName: "Schreiber",
      gender: "m",
      birthday: d(1999, 12, 1),
      street: "Frohnhauser Str.",
      houseNumber: "55",
      zip: "45144",
      city: "Essen",
      email: "jonas.schreiber@example.com",
      phone: "0201 4445566",
      status: "ACTIVE",
      contractType: "CONTRACT",
      locations: { connect: [{ id: essen.id }] },
      joinedAt: jonasInput.joinedAt,
      bankAccount: {
        create: {
          gymId,
          bankName: "ING",
          iban: "DE27100777770209299700",
          bic: "INGDDEFFXXX",
          directDebitAuthorized: true,
        },
      },
      contract: {
        create: {
          gymId,
          planId: planBasic.id,
          termMonths: jonasInput.termMonths,
          autoRenewalMonths: jonasInput.autoRenewalMonths,
          noticePeriodMonths: jonasInput.noticePeriodMonths,
          feeCents: 5900,
          debitOption: "WEEKLY",
          contractEndDate: jonasCalc.contractEndDate,
          cancellationPossibleUntil: jonasCalc.cancellationPossibleUntil,
          cancellationEffectiveAt: jonasCalc.cancellationEffectiveAt,
          autoRenewed: jonasCalc.autoRenewed,
        },
      },
      sepaDebits: {
        create: [
          { gymId, amountCents: 1475, bookingDate: d(2026, 6, 29), status: "DONE" },
          { gymId, amountCents: 1475, bookingDate: d(2026, 7, 6), status: "OPEN" },
        ],
      },
    },
  });

  const miraInput = {
    joinedAt: d(2025, 1, 15),
    termMonths: 24,
    autoRenewalMonths: 6,
    noticePeriodMonths: 3,
    cancellationReceivedAt: null,
  };
  const miraCalc = calculateContractCancellation(miraInput);
  const mira = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Mira",
      lastName: "Albrecht",
      gender: "w",
      birthday: d(1992, 6, 27),
      street: "Grafenberger Allee",
      houseNumber: "120",
      zip: "40237",
      city: "Düsseldorf",
      email: "mira.albrecht@example.com",
      phone: "0211 5556677",
      status: "ACTIVE",
      contractType: "CONTRACT",
      // Testfall fuer "Alle Standorte" (nicht vertragsgekoppelt, hier nur zur
      // Abwechslung mit dem Flatrate-Kunden kombiniert).
      allLocations: true,
      joinedAt: miraInput.joinedAt,
      bankAccount: {
        create: {
          gymId,
          bankName: "Commerzbank",
          iban: "DE43500400000123456789",
          bic: "COBADEFFXXX",
          directDebitAuthorized: true,
        },
      },
      contract: {
        create: {
          gymId,
          planId: planFlatrate.id,
          termMonths: miraInput.termMonths,
          autoRenewalMonths: miraInput.autoRenewalMonths,
          noticePeriodMonths: miraInput.noticePeriodMonths,
          feeCents: 7900,
          debitOption: "MONTHLY",
          contractEndDate: miraCalc.contractEndDate,
          cancellationPossibleUntil: miraCalc.cancellationPossibleUntil,
          cancellationEffectiveAt: miraCalc.cancellationEffectiveAt,
          autoRenewed: miraCalc.autoRenewed,
        },
      },
    },
  });

  const hannahInput = {
    joinedAt: d(2025, 6, 1),
    termMonths: 12,
    autoRenewalMonths: 3,
    noticePeriodMonths: 3,
    pausedFrom: d(2026, 5, 1),
    pausedTo: d(2026, 6, 30),
    cancellationReceivedAt: null,
  };
  const hannahCalc = calculateContractCancellation(hannahInput);
  const hannah = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Hannah",
      lastName: "Braun",
      gender: "w",
      birthday: d(1994, 3, 8),
      street: "Huyssenallee",
      houseNumber: "20",
      zip: "45128",
      city: "Essen",
      email: "hannah.braun@example.com",
      status: "PAUSED",
      contractType: "CONTRACT",
      locations: { connect: [{ id: essen.id }] },
      joinedAt: hannahInput.joinedAt,
      notes: "Pausiert wegen Schwangerschaft, meldet sich nach Rückkehr.",
      bankAccount: {
        create: {
          gymId,
          bankName: "Sparkasse Essen",
          iban: "DE56370501980000123456",
          bic: "COKSDE33XXX",
          directDebitAuthorized: true,
        },
      },
      contract: {
        create: {
          gymId,
          planId: planPremium.id,
          termMonths: hannahInput.termMonths,
          autoRenewalMonths: hannahInput.autoRenewalMonths,
          noticePeriodMonths: hannahInput.noticePeriodMonths,
          feeCents: 6500,
          debitOption: "MONTHLY",
          pausedFrom: hannahInput.pausedFrom,
          pausedTo: hannahInput.pausedTo,
          contractEndDate: hannahCalc.contractEndDate,
          cancellationPossibleUntil: hannahCalc.cancellationPossibleUntil,
          cancellationEffectiveAt: hannahCalc.cancellationEffectiveAt,
          autoRenewed: hannahCalc.autoRenewed,
        },
      },
    },
  });

  // Alte, beendete Verträge ohne Bankdaten (unvollständiger Datenzustand).
  const erikInput = {
    joinedAt: d(2023, 1, 1),
    termMonths: 12,
    autoRenewalMonths: 3,
    noticePeriodMonths: 1,
    cancellationReceivedAt: d(2023, 11, 15),
  };
  const erikCalc = calculateContractCancellation(erikInput);
  const erik = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Erik",
      lastName: "Lange",
      gender: "m",
      birthday: d(1980, 10, 5),
      city: "Düsseldorf",
      status: "INACTIVE",
      contractType: "CONTRACT",
      locations: { connect: [{ id: duesseldorf.id }] },
      joinedAt: erikInput.joinedAt,
      contract: {
        create: {
          gymId,
          planId: planBasic.id,
          termMonths: erikInput.termMonths,
          autoRenewalMonths: erikInput.autoRenewalMonths,
          noticePeriodMonths: erikInput.noticePeriodMonths,
          feeCents: 5500,
          debitOption: "MONTHLY",
          cancellationReceivedAt: erikInput.cancellationReceivedAt,
          contractEndDate: erikCalc.contractEndDate,
          cancellationPossibleUntil: erikCalc.cancellationPossibleUntil,
          cancellationEffectiveAt: erikCalc.cancellationEffectiveAt,
          autoRenewed: erikCalc.autoRenewed,
        },
      },
    },
  });

  const juliaInput = {
    joinedAt: d(2022, 5, 1),
    termMonths: 6,
    autoRenewalMonths: 1,
    noticePeriodMonths: 1,
    cancellationReceivedAt: d(2022, 10, 1),
  };
  const juliaCalc = calculateContractCancellation(juliaInput);
  const juliaVogt = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Julia",
      lastName: "Vogt",
      gender: "w",
      birthday: d(1998, 1, 20),
      city: "Essen",
      status: "INACTIVE",
      contractType: "CONTRACT",
      locations: { connect: [{ id: essen.id }] },
      joinedAt: juliaInput.joinedAt,
      contract: {
        create: {
          gymId,
          planId: planBasic.id,
          termMonths: juliaInput.termMonths,
          autoRenewalMonths: juliaInput.autoRenewalMonths,
          noticePeriodMonths: juliaInput.noticePeriodMonths,
          feeCents: 4900,
          debitOption: "MONTHLY",
          cancellationReceivedAt: juliaInput.cancellationReceivedAt,
          contractEndDate: juliaCalc.contractEndDate,
          cancellationPossibleUntil: juliaCalc.cancellationPossibleUntil,
          cancellationEffectiveAt: juliaCalc.cancellationEffectiveAt,
          autoRenewed: juliaCalc.autoRenewed,
        },
      },
    },
  });

  // --- Gutscheine -----------------------------------------------------
  const voucher5 = await prisma.voucherType.create({
    data: { gymId, label: "5er Karte", validityMonths: 6, sessionCount: 5, priceCents: 6500 },
  });
  const voucher10 = await prisma.voucherType.create({
    data: { gymId, label: "10er Karte", validityMonths: 12, sessionCount: 10, priceCents: 12000 },
  });
  const voucher15 = await prisma.voucherType.create({
    data: { gymId, label: "15er Karte", validityMonths: 18, sessionCount: 15, priceCents: 16500 },
  });
  await prisma.voucherType.create({
    data: { gymId, label: "20er Karte", validityMonths: 24, sessionCount: 20, priceCents: 20000 },
  });

  const paul = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Paul",
      lastName: "Weber",
      gender: "m",
      birthday: d(1996, 4, 11),
      city: "Essen",
      status: "ACTIVE",
      contractType: "VOUCHER",
      locations: { connect: [{ id: essen.id }] },
      joinedAt: d(2026, 4, 1),
      voucher: {
        create: {
          gymId,
          voucherTypeId: voucher10.id,
          assignedAt: d(2026, 4, 1),
          validUntil: d(2027, 4, 1),
          remainingSessions: 6,
        },
      },
    },
  });

  const katrin = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Katrin",
      lastName: "Sommer",
      gender: "w",
      birthday: d(2000, 7, 2),
      city: "Düsseldorf",
      status: "ACTIVE",
      contractType: "VOUCHER",
      locations: { connect: [{ id: duesseldorf.id }] },
      joinedAt: d(2026, 5, 1),
      voucher: {
        create: {
          gymId,
          voucherTypeId: voucher5.id,
          assignedAt: d(2026, 5, 1),
          validUntil: d(2026, 11, 1),
          remainingSessions: 2,
        },
      },
    },
  });

  const felix = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Felix",
      lastName: "Roth",
      gender: "m",
      birthday: d(1989, 9, 17),
      city: "Düsseldorf",
      status: "ACTIVE",
      contractType: "VOUCHER",
      locations: { connect: [{ id: duesseldorf.id }] },
      joinedAt: d(2026, 2, 1),
      voucher: {
        create: {
          gymId,
          voucherTypeId: voucher15.id,
          assignedAt: d(2026, 2, 1),
          validUntil: d(2027, 8, 1),
          remainingSessions: 11,
        },
      },
    },
  });

  // --- Probetrainings -----------------------------------------------------
  await prisma.trial.create({
    data: {
      gymId,
      firstName: "Sophie",
      lastName: "Ahrens",
      phone: "0201 6667788",
      email: "sophie.ahrens@example.com",
      locationId: essen.id,
      message: "Interessiere mich für Yoga.",
      status: "OPEN",
    },
  });

  await prisma.trial.create({
    data: {
      gymId,
      firstName: "Marco",
      lastName: "Peters",
      phone: "0211 7778899",
      email: "marco.peters@example.com",
      locationId: duesseldorf.id,
      message: "Würde gerne Rücken-fit ausprobieren.",
      status: "PROPOSED",
      proposedSlots: {
        create: [
          {
            gymId,
            startsAt: d(2026, 7, 22),
            courseId: ruecken.id,
            token: "trial-marco-1",
            response: "PENDING",
          },
        ],
      },
    },
  });

  const trialDavid = await prisma.trial.create({
    data: {
      gymId,
      firstName: "David",
      lastName: "Krüger",
      phone: "0201 8889900",
      email: "david.krueger@example.com",
      locationId: essen.id,
      message: "Erstkontakt über die Website.",
      status: "ACCEPTED",
      proposedSlots: {
        create: [
          {
            gymId,
            startsAt: d(2026, 7, 20),
            courseId: yoga.id,
            token: "trial-david-1",
            response: "ACCEPTED",
            respondedAt: d(2026, 7, 13),
          },
        ],
      },
    },
  });

  const david = await prisma.customer.create({
    data: {
      gymId,
      firstName: "David",
      lastName: "Krüger",
      gender: "m",
      birthday: d(1994, 5, 28),
      city: "Essen",
      email: "david.krueger@example.com",
      phone: "0201 8889900",
      status: "ACTIVE",
      contractType: "TRIAL",
      locations: { connect: [{ id: essen.id }] },
      joinedAt: d(2026, 7, 13),
      originTrialId: trialDavid.id,
    },
  });

  await prisma.trial.create({
    data: {
      gymId,
      firstName: "Lisa",
      lastName: "Otten",
      email: "lisa.otten@example.com",
      locationId: essen.id,
      message: "Zwei Terminvorschläge leider beide nicht passend.",
      status: "DECLINED",
      proposedSlots: {
        create: [
          {
            gymId,
            startsAt: d(2026, 7, 15),
            courseId: crossfit.id,
            token: "trial-lisa-1",
            response: "DECLINED",
            respondedAt: d(2026, 7, 10),
          },
          {
            gymId,
            startsAt: d(2026, 7, 18),
            courseId: crossfit.id,
            token: "trial-lisa-2",
            response: "DECLINED",
            respondedAt: d(2026, 7, 11),
          },
        ],
      },
    },
  });

  await prisma.trial.create({
    data: {
      gymId,
      firstName: "Tobias",
      lastName: "Reiter",
      email: "tobias.reiter@example.com",
      locationId: duesseldorf.id,
      status: "OPEN",
    },
  });

  // --- Kalender -----------------------------------------------------
  // Datumsbasis relativ zu "jetzt" statt hartkodiert auf ein festes Datum -
  // sonst faellt der komplette Kursplan nach ein paar Tagen in die
  // Vergangenheit und "diese Woche" in der Mobile App waere leer, egal
  // wann der Seed tatsaechlich laeuft.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function at(date: Date, hour: number) {
    const copy = new Date(date);
    copy.setHours(hour, 0, 0, 0);
    return copy;
  }

  // Wochentag 0=So .. 6=Sa (JS-Konvention), passend zu Date#getDay().
  const weeklyTemplate: {
    weekday: number;
    course: typeof yoga;
    location: typeof essen;
    hour: number;
    capacity: number;
  }[] = [
    { weekday: 1, course: bootcamp, location: essen, hour: 7, capacity: 8 },
    { weekday: 1, course: yoga, location: essen, hour: 9, capacity: 12 },
    { weekday: 1, course: ruecken, location: duesseldorf, hour: 10, capacity: 15 },
    { weekday: 1, course: kickboxen, location: essen, hour: 18, capacity: 14 },
    { weekday: 2, course: crossfit, location: essen, hour: 7, capacity: 10 },
    { weekday: 2, course: pilates, location: duesseldorf, hour: 9, capacity: 12 },
    { weekday: 2, course: zumba, location: essen, hour: 19, capacity: 20 },
    { weekday: 3, course: yoga, location: duesseldorf, hour: 9, capacity: 12 },
    { weekday: 3, course: bootcamp, location: essen, hour: 18, capacity: 8 },
    { weekday: 3, course: kickboxen, location: essen, hour: 19, capacity: 14 },
    { weekday: 4, course: ruecken, location: duesseldorf, hour: 10, capacity: 15 },
    { weekday: 4, course: crossfit, location: essen, hour: 18, capacity: 10 },
    { weekday: 4, course: zumba, location: duesseldorf, hour: 17, capacity: 20 },
    { weekday: 5, course: yoga, location: essen, hour: 9, capacity: 12 },
    { weekday: 5, course: pilates, location: duesseldorf, hour: 17, capacity: 12 },
    { weekday: 5, course: bootcamp, location: essen, hour: 7, capacity: 8 },
    { weekday: 6, course: crossfit, location: essen, hour: 10, capacity: 10 },
    { weekday: 6, course: zumba, location: essen, hour: 11, capacity: 20 },
    { weekday: 0, course: yoga, location: duesseldorf, hour: 11, capacity: 12 },
    { weekday: 0, course: pilates, location: essen, hour: 18, capacity: 12 },
  ];

  // 6 Wochen Vergangenheit bis 4 Wochen Zukunft ab heute - deckt "diese
  // Woche" + "naechste Woche" der Mobile App weiterhin vollstaendig ab
  // (dayOffset 0..13), liefert aber zusaetzlich echte Kalender-Historie fuer
  // Statistik/Bereits-besucht und macht den Admin-Kalender beim Zurueck-
  // Blaettern nicht sofort leer (Absprache: Datenbestand soll "realer"
  // wirken statt nur ein 2-Wochen-Fenster zu zeigen).
  const CALENDAR_PAST_DAYS = 42;
  const CALENDAR_FUTURE_DAYS = 28;
  const createdEvents: { id: string; capacity: number; startsAt: Date }[] = [];
  for (let dayOffset = -CALENDAR_PAST_DAYS; dayOffset < CALENDAR_FUTURE_DAYS; dayOffset++) {
    const date = addDays(today, dayOffset);
    const weekday = date.getDay();
    for (const slot of weeklyTemplate.filter((s) => s.weekday === weekday)) {
      const startsAt = at(date, slot.hour);
      // Nur die HEUTIGEN, bereits vergangenen Stunden ueberspringen - echte
      // Vergangenheitstage (dayOffset < 0) sollen bewusst erhalten bleiben.
      if (dayOffset === 0 && startsAt <= new Date()) continue;
      const event = await prisma.calendarEvent.create({
        data: {
          gymId,
          courseId: slot.course.id,
          locationId: slot.location.id,
          startsAt,
          endsAt: at(date, slot.hour + 1),
          capacity: slot.capacity,
        },
      });
      createdEvents.push(event);
    }
  }

  // Standalone Event-Termine (kein Kurs) - "Tag der offenen Tuer" alle paar
  // Wochen ueber denselben Zeitraum verteilt statt nur einmal naechsten
  // Sonntag, damit der Events-Tab nicht leer wirkt und auch Historie zeigt.
  const openDayEvents: { id: string; capacity: number; startsAt: Date }[] = [];
  for (let dayOffset = -CALENDAR_PAST_DAYS; dayOffset < CALENDAR_FUTURE_DAYS; dayOffset += 21) {
    const sunday = addDays(today, dayOffset + ((7 - addDays(today, dayOffset).getDay()) % 7));
    const startsAt = at(sunday, 11);
    if (dayOffset === 0 && startsAt <= new Date()) continue;
    const event = await prisma.calendarEvent.create({
      data: {
        gymId,
        eventId: openDay.id,
        locationId: essen.id,
        startsAt,
        endsAt: at(sunday, 15),
        capacity: openDay.participantLimit,
      },
    });
    openDayEvents.push(event);
  }

  // Groesserer Kundenpool als nur die urspruenglichen 3 Test-Kunden, damit
  // auch kapazitaetsstarke Kurse (15-20 Plaetze) sich sinnvoll fuellen
  // lassen und Wartelisten-Szenarien entstehen.
  const bookingCustomers = [
    sabine, ben, nina, jonas, mira, hannah, erik, juliaVogt, david, paul, katrin, felix,
  ];

  // Wochenkontingent je Kunde (aus dem oben vergebenen Vertragsplan bzw.
  // null fuer Gutschein-/Probetraining-Kunden ohne Plan) - muss beim
  // BOOKED-Verteilen unten beachtet werden, sonst entstehen Kunden mit z.B.
  // 17 Buchungen in einer Woche trotz "Basic 2x/Woche"-Vertrag (in der App
  // sichtbar als widersinniger "17/2"-Kontingent-Ring).
  const weeklyLimitByCustomerId = new Map<string, number | null>([
    [sabine.id, planBasic.weeklyLimit],
    [ben.id, planBasic.weeklyLimit],
    [nina.id, planPremium.weeklyLimit],
    [jonas.id, planBasic.weeklyLimit],
    [mira.id, planFlatrate.weeklyLimit],
    [hannah.id, planPremium.weeklyLimit],
    [erik.id, planBasic.weeklyLimit],
    [juliaVogt.id, planBasic.weeklyLimit],
    [david.id, null],
    [paul.id, null],
    [katrin.id, null],
    [felix.id, null],
  ]);

  // --- Bulk-Kundenpool -----------------------------------------------------
  // Zusaetzlich zu den oben einzeln von Hand angelegten Beispielkunden (mit
  // dokumentierten Szenarien) ein deutlich groesserer, generierter
  // Kundenstamm - macht Kundenliste, Kalenderbelegung und Statistik
  // realistisch "voll" statt nur eine Handvoll Testfaelle zu zeigen. Bewusst
  // nicht einzeln kommentiert wie die Faelle oben, hier zaehlt nur Menge/
  // Variation, kein bestimmtes Szenario.
  const bulkFirstNames = [
    "Anna", "Lukas", "Marie", "Finn", "Laura", "Jonas", "Lena", "Max", "Sarah", "Tim",
    "Julia", "Niklas", "Emma", "Paul", "Lea", "Felix", "Sophie", "Leon", "Mia", "David",
    "Hannah", "Tom", "Clara", "Jan", "Nele", "Simon", "Lisa", "Fabian", "Nora", "Moritz",
    "Johanna", "Alina", "Kevin", "Vanessa", "Marcel", "Franziska", "Daniel", "Theresa",
    "Patrick", "Melanie", "Sebastian", "Sandra", "Christian", "Stefanie", "Michael",
    "Nadine", "Andreas", "Katharina", "Thomas", "Miriam",
  ];
  const bulkLastNames = [
    "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
    "Schulz", "Hoffmann", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Neumann",
    "Schwarz", "Zimmermann", "Hartmann", "Werner", "Schmitt", "Meier", "Lehmann",
    "Huber", "Mayer", "Herrmann", "Walter", "König", "Peters", "Möller", "Winter",
    "Kaiser", "Fuchs", "Graf", "Beck", "Böhm", "Horn", "Arnold", "Berger", "Jung", "Otto",
  ];
  const bulkStreets = [
    "Hauptstr.", "Gartenweg", "Bahnhofstr.", "Schulstr.", "Bergstr.", "Ringstr.",
    "Waldweg", "Talstr.", "Kirchweg", "Am Markt", "Lindenallee", "Rosenweg",
    "Friedrichstr.", "Wilhelmstr.", "Parkallee",
  ];
  const essenZips = ["45127", "45128", "45130", "45131", "45144"];
  const duesseldorfZips = ["40212", "40213", "40237", "40239"];

  function randomOf<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function randomInt(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  const bulkPlans = [planBasic, planPremium, planFlatrate];
  const bulkVoucherTypes = [voucher5, voucher10, voucher15];
  const BULK_CUSTOMER_COUNT = 55;

  for (let i = 0; i < BULK_CUSTOMER_COUNT; i++) {
    const firstName = randomOf(bulkFirstNames);
    const lastName = randomOf(bulkLastNames);
    const gender = randomOf(["w", "m"] as const);
    const inEssen = Math.random() < 0.55;
    const location = inEssen ? essen : duesseldorf;
    const zip = randomOf(inEssen ? essenZips : duesseldorfZips);
    const city = inEssen ? "Essen" : "Düsseldorf";
    const allLocations = Math.random() < 0.1;
    const joinedAt = addDays(today, -randomInt(30, 730));
    const birthday = addDays(today, -randomInt(9000, 20000));
    const phone = `0${inEssen ? "201" : "211"} ${randomInt(1000000, 9999999)}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const baseData = {
      gymId,
      firstName,
      lastName,
      gender,
      birthday,
      email,
      phone,
      city,
      allLocations,
      locations: allLocations ? undefined : { connect: [{ id: location.id }] },
      joinedAt,
    };

    const contractRoll = Math.random();
    if (contractRoll < 0.6) {
      // CONTRACT
      const statusRoll = Math.random();
      const status = statusRoll < 0.7 ? "ACTIVE" : statusRoll < 0.85 ? "PAUSED" : "INACTIVE";
      const plan = randomOf(bulkPlans);
      const termMonths = randomOf([6, 12, 24]);
      const autoRenewalMonths = randomOf([1, 3, 6]);
      const noticePeriodMonths = randomOf([1, 3]);
      const hasCancelled = status === "INACTIVE" || Math.random() < 0.1;
      const cancellationReceivedAt = hasCancelled ? addDays(today, -randomInt(5, 90)) : null;
      const pausedFrom = status === "PAUSED" ? addDays(today, -randomInt(0, 30)) : null;
      const pausedTo = status === "PAUSED" ? addDays(today, randomInt(7, 45)) : null;
      const calc = calculateContractCancellation({
        joinedAt,
        termMonths,
        autoRenewalMonths,
        noticePeriodMonths,
        pausedFrom,
        pausedTo,
        cancellationReceivedAt,
      });
      const customer = await prisma.customer.create({
        data: {
          ...baseData,
          street: randomOf(bulkStreets),
          houseNumber: String(randomInt(1, 140)),
          zip,
          status,
          contractType: "CONTRACT",
          contract: {
            create: {
              gymId,
              planId: plan.id,
              termMonths,
              autoRenewalMonths,
              noticePeriodMonths,
              feeCents: randomOf([4900, 5500, 5900, 6500, 7900]),
              debitOption: randomOf(["MONTHLY", "WEEKLY"] as const),
              pausedFrom,
              pausedTo,
              cancellationReceivedAt,
              contractEndDate: calc.contractEndDate,
              cancellationPossibleUntil: calc.cancellationPossibleUntil,
              cancellationEffectiveAt: calc.cancellationEffectiveAt,
              autoRenewed: calc.autoRenewed,
            },
          },
        },
      });
      bookingCustomers.push(customer);
      weeklyLimitByCustomerId.set(customer.id, plan.weeklyLimit);
    } else if (contractRoll < 0.85) {
      // VOUCHER
      const voucherType = randomOf(bulkVoucherTypes);
      const customer = await prisma.customer.create({
        data: {
          ...baseData,
          status: Math.random() < 0.85 ? "ACTIVE" : "INACTIVE",
          contractType: "VOUCHER",
          voucher: {
            create: {
              gymId,
              voucherTypeId: voucherType.id,
              assignedAt: joinedAt,
              validUntil: addDays(joinedAt, voucherType.validityMonths * 30),
              remainingSessions: randomInt(0, voucherType.sessionCount),
            },
          },
        },
      });
      bookingCustomers.push(customer);
      weeklyLimitByCustomerId.set(customer.id, null);
    } else {
      // TRIAL
      const customer = await prisma.customer.create({
        data: {
          ...baseData,
          joinedAt: addDays(today, -randomInt(0, 14)),
          status: "ACTIVE",
          contractType: "TRIAL",
        },
      });
      bookingCustomers.push(customer);
      weeklyLimitByCustomerId.set(customer.id, null);
    }
  }

  // Bulk-Kunden auch auf die "Tag der offenen Tuer"-Zusatztermine verteilen
  // (siehe oben) - Events zaehlen nicht gegen das Wochenkontingent, deshalb
  // hier ohne pickBookableCustomers-Kontingentpruefung.
  for (const [index, event] of openDayEvents.entries()) {
    const attendeeCount = randomInt(8, Math.min(30, event.capacity));
    const offset = index * 7;
    const attendees = pickCustomers(attendeeCount, offset);
    if (attendees.length > 0) {
      await prisma.booking.createMany({
        data: attendees.map((c) => ({
          gymId,
          calendarEventId: event.id,
          customerId: c.id,
          status: "BOOKED",
        })),
      });
    }
  }

  function isoWeekStart(date: Date): string {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    const day = copy.getDay(); // 0=So..6=Sa
    copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day)); // auf Montag zurueck
    return copy.toISOString();
  }

  // usedThisWeek je Kunde+Kalenderwoche, ausschliesslich fuer BOOKED
  // hochgezaehlt (Warteliste zaehlt laut /api/mobile/courses nicht gegen
  // das Kontingent).
  const weeklyUsage = new Map<string, number>();

  function pickCustomers(count: number, offset: number) {
    const picked = new Set<(typeof bookingCustomers)[number]>();
    for (let i = 0; i < count && picked.size < bookingCustomers.length; i++) {
      picked.add(bookingCustomers[(offset + i) % bookingCustomers.length]);
    }
    return [...picked];
  }

  // Wie pickCustomers, ueberspringt aber Kunden, die fuer die Kalenderwoche
  // von `weekStart` ihr Wochenkontingent bereits ausgeschoepft haben, und
  // zaehlt jede Auswahl sofort in weeklyUsage mit.
  function pickBookableCustomers(count: number, offset: number, weekStart: string) {
    const picked: (typeof bookingCustomers)[number][] = [];
    for (
      let i = 0;
      i < bookingCustomers.length * 2 && picked.length < count;
      i++
    ) {
      const candidate = bookingCustomers[(offset + i) % bookingCustomers.length];
      if (picked.includes(candidate)) continue;
      const limit = weeklyLimitByCustomerId.get(candidate.id) ?? null;
      const key = `${candidate.id}|${weekStart}`;
      const used = weeklyUsage.get(key) ?? 0;
      if (limit !== null && used >= limit) continue;
      picked.push(candidate);
      weeklyUsage.set(key, used + 1);
    }
    return picked;
  }

  // Belegung zyklisch zwischen "locker", "fast voll" und "voll + Warteliste"
  // variieren, statt jeden Termin einzeln von Hand zu bestuecken - ergibt
  // eine gute Mischung aus gruen/gelb/rot ueber die vielen generierten
  // Termine (Sabine ist als Haupt-Testkonto bewusst nicht ueberall dabei,
  // damit in der App auch unbebuchte Kurse zu sehen sind).
  for (const [index, event] of createdEvents.entries()) {
    const tier = index % 4;
    const offset = index * 3;
    const weekStart = isoWeekStart(event.startsAt);
    let bookedCount: number;
    let waitlistCount = 0;
    if (tier === 0) bookedCount = Math.round(event.capacity * 0.25);
    else if (tier === 1) bookedCount = Math.round(event.capacity * 0.5);
    else if (tier === 2) bookedCount = Math.round(event.capacity * 0.85);
    else {
      bookedCount = event.capacity;
      waitlistCount = 2;
    }

    const booked = pickBookableCustomers(bookedCount, offset, weekStart);
    if (booked.length > 0) {
      await prisma.booking.createMany({
        data: booked.map((c) => ({
          gymId,
          calendarEventId: event.id,
          customerId: c.id,
          status: "BOOKED",
        })),
      });
    }

    // Warteliste nur, wenn der Kurs durch die tatsaechlich gefundenen
    // Buchungen auch wirklich voll wurde - bei kapazitaetsstarken Kursen
    // (15-20 Plaetze) reicht der begrenzte Kundenpool sonst nicht aus, um
    // bookedCount wirklich zu erreichen (Wochenkontingent-Kandidaten werden
    // uebersprungen), und es entstuenden Wartelisten-Eintraege bei Kursen mit
    // noch massenhaft freien Plaetzen (widersinnig in der App sichtbar).
    if (booked.length < event.capacity) {
      waitlistCount = 0;
    }

    if (waitlistCount > 0) {
      const waitlisted = pickCustomers(waitlistCount, offset + bookedCount).filter(
        (c) => !booked.includes(c),
      );
      for (const [wIndex, c] of waitlisted.entries()) {
        await prisma.booking.create({
          data: {
            gymId,
            calendarEventId: event.id,
            customerId: c.id,
            status: "WAITLISTED",
            waitlistPosition: wIndex + 1,
          },
        });
      }
    }
  }

  // Sabine (Haupt-Testkonto fuers manuelle Durchklicken) bekommt zusaetzlich
  // eine bewusst ruhige, gut ueberschaubare eigene Buchung in den naechsten
  // Tagen, unabhaengig von der zyklischen Verteilung oben - aber nur, wenn
  // ihr Wochenkontingent das noch hergibt und sie nicht schon im selben
  // Termin gebucht ist.
  const sabineLimit = weeklyLimitByCustomerId.get(sabine.id) ?? null;
  const sabineEvent = createdEvents.find((e) => {
    if (e.capacity < 10) return false;
    const key = `${sabine.id}|${isoWeekStart(e.startsAt)}`;
    const used = weeklyUsage.get(key) ?? 0;
    return sabineLimit === null || used < sabineLimit;
  });
  if (sabineEvent) {
    const existing = await prisma.booking.findFirst({
      where: { calendarEventId: sabineEvent.id, customerId: sabine.id },
    });
    if (!existing) {
      await prisma.booking.create({
        data: { gymId, calendarEventId: sabineEvent.id, customerId: sabine.id, status: "BOOKED" },
      });
      const key = `${sabine.id}|${isoWeekStart(sabineEvent.startsAt)}`;
      weeklyUsage.set(key, (weeklyUsage.get(key) ?? 0) + 1);
    }
  }

  // Vergangene Buchungen fuer Sabine - Grundlage fuer die automatisch aus
  // der Buchungshistorie abgeleiteten "Stammkurse" (/api/mobile/favorites).
  // Ohne Vergangenheits-Daten waere die Favoriten-Liste im frischen
  // Seed-Zustand immer leer, da dort nur vergangene (nicht zukuenftige)
  // Buchungen zaehlen. Yoga Flow fast woechentlich (klarer Favorit),
  // Bootcamp nur alle drei Wochen (erreicht knapp den Mindest-Schwellwert).
  for (let w = 1; w <= 10; w++) {
    const yogaDate = addDays(today, -w * 7 - 1);
    const yogaEvent = await prisma.calendarEvent.create({
      data: { gymId, courseId: yoga.id, locationId: essen.id, startsAt: at(yogaDate, 9), endsAt: at(yogaDate, 10), capacity: 12 },
    });
    await prisma.booking.create({
      data: { gymId, calendarEventId: yogaEvent.id, customerId: sabine.id, status: "BOOKED" },
    });

    if (w % 3 === 0) {
      const bootcampDate = addDays(today, -w * 7 - 3);
      const bootcampEvent = await prisma.calendarEvent.create({
        data: { gymId, courseId: bootcamp.id, locationId: essen.id, startsAt: at(bootcampDate, 7), endsAt: at(bootcampDate, 8), capacity: 8 },
      });
      await prisma.booking.create({
        data: { gymId, calendarEventId: bootcampEvent.id, customerId: sabine.id, status: "BOOKED" },
      });
    }
  }

  // --- Mobile-App-Testkonten (alle Vertragsarten, alle Szenarien) --------
  // Ein Account pro Vertragsart mit fest zugewiesenen (nicht zufaelligen)
  // Terminen, die alle relevanten Mobile-App-Zustaende an einem Stueck
  // durchklickbar machen (Warteliste, Kontingent, Stornofrist, Stammkurs,
  // Events) - im Unterschied zum zyklischen Buchungspool oben, der Zustaende
  // nur zufaellig ueber viele Kunden verstreut. Login per OTP (E-Mail unten,
  // Code steht im Server-Log).
  const testVertragInput = {
    joinedAt: addDays(today, -60),
    termMonths: 12,
    autoRenewalMonths: 3,
    noticePeriodMonths: 3,
    cancellationReceivedAt: null,
  };
  const testVertragCalc = calculateContractCancellation(testVertragInput);
  const testVertrag = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Test",
      lastName: "Vertrag",
      gender: "w",
      birthday: d(1992, 3, 14),
      city: "Essen",
      email: "test.vertrag@example.com",
      phone: "0201 0000001",
      status: "ACTIVE",
      contractType: "CONTRACT",
      allLocations: true,
      joinedAt: testVertragInput.joinedAt,
      contract: {
        create: {
          gymId,
          planId: planBasic.id,
          termMonths: testVertragInput.termMonths,
          autoRenewalMonths: testVertragInput.autoRenewalMonths,
          noticePeriodMonths: testVertragInput.noticePeriodMonths,
          feeCents: 5900,
          debitOption: "MONTHLY",
          contractEndDate: testVertragCalc.contractEndDate,
          cancellationPossibleUntil: testVertragCalc.cancellationPossibleUntil,
          cancellationEffectiveAt: testVertragCalc.cancellationEffectiveAt,
          autoRenewed: testVertragCalc.autoRenewed,
        },
      },
    },
  });

  const testGutschein = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Test",
      lastName: "Gutschein",
      gender: "m",
      birthday: d(1990, 6, 21),
      city: "Essen",
      email: "test.gutschein@example.com",
      phone: "0201 0000002",
      status: "ACTIVE",
      contractType: "VOUCHER",
      allLocations: true,
      joinedAt: addDays(today, -30),
      voucher: {
        create: {
          gymId,
          voucherTypeId: voucher10.id,
          assignedAt: addDays(today, -30),
          validUntil: addDays(today, 300),
          remainingSessions: 7,
        },
      },
    },
  });

  const testProbetraining = await prisma.customer.create({
    data: {
      gymId,
      firstName: "Test",
      lastName: "Probetraining",
      gender: "w",
      birthday: d(1998, 11, 9),
      city: "Essen",
      email: "test.probetraining@example.com",
      phone: "0201 0000003",
      status: "ACTIVE",
      contractType: "TRIAL",
      allLocations: true,
      joinedAt: addDays(today, -5),
    },
  });

  // Fuellt Plaetze fuer die Belegungs-Szenarien unten auf - ausschliesslich
  // Kunden, die (INACTIVE/PAUSED) ohnehin nie per App einloggen koennen,
  // damit deren eigener Wochenkontingent-Anzeige nirgends verzerrt wird.
  const scenarioFillers = [sabine, nina, hannah, erik, juliaVogt];

  async function fillSeats(eventId: string, count: number) {
    await prisma.booking.createMany({
      data: scenarioFillers.slice(0, count).map((c) => ({
        gymId,
        calendarEventId: eventId,
        customerId: c.id,
        status: "BOOKED",
      })),
    });
  }

  // hourBase staffelt die drei Testkonten auf unterschiedliche Uhrzeiten
  // (12/13/14 Uhr etc.) - alle drei teilen sich Standort Essen, ohne
  // Staffelung wuerden ihre Szenario-Termine sich als scheinbar doppelte
  // Karten im Kurse-/Events-Tab der jeweils anderen Konten stapeln.
  async function seedMobileTestScenarios(customerId: string, hourBase: number) {
    // A) Diese Woche gebucht, normal stornierbar (gruen).
    const a = await prisma.calendarEvent.create({
      data: {
        gymId,
        courseId: yoga.id,
        locationId: essen.id,
        startsAt: at(addDays(today, 1), hourBase),
        endsAt: at(addDays(today, 1), hourBase + 1),
        capacity: 10,
      },
    });
    await prisma.booking.create({ data: { gymId, calendarEventId: a.id, customerId, status: "BOOKED" } });

    // B) Diese Woche gebucht, Stornofrist abgelaufen (CrossFit hat 24h
    // Frist, Termin beginnt in 10h - Storno-Icon muss ausgegraut sein).
    const cutoffStart = new Date(Date.now() + (10 + (hourBase - 12)) * 60 * 60 * 1000);
    const b = await prisma.calendarEvent.create({
      data: {
        gymId,
        courseId: crossfit.id,
        locationId: essen.id,
        startsAt: cutoffStart,
        endsAt: new Date(cutoffStart.getTime() + 60 * 60 * 1000),
        capacity: 10,
      },
    });
    await prisma.booking.create({ data: { gymId, calendarEventId: b.id, customerId, status: "BOOKED" } });

    // C) Wartelistenplatz in einem vollen Kurs.
    const c = await prisma.calendarEvent.create({
      data: {
        gymId,
        courseId: bootcamp.id,
        locationId: essen.id,
        startsAt: at(addDays(today, 2), hourBase),
        endsAt: at(addDays(today, 2), hourBase + 1),
        capacity: 3,
      },
    });
    await fillSeats(c.id, 3);
    await prisma.booking.create({
      data: { gymId, calendarEventId: c.id, customerId, status: "WAITLISTED", waitlistPosition: 1 },
    });

    // D) Ungebucht, fast voll (gelb).
    const dEvt = await prisma.calendarEvent.create({
      data: {
        gymId,
        courseId: pilates.id,
        locationId: essen.id,
        startsAt: at(addDays(today, 3), hourBase),
        endsAt: at(addDays(today, 3), hourBase + 1),
        capacity: 5,
      },
    });
    await fillSeats(dEvt.id, 4);

    // E) Ungebucht, komplett voll (rot) - bietet "Warteliste"-Button statt
    // "Buchen" (Gegenstueck zu C, hier aber noch NICHT selbst angemeldet).
    const e = await prisma.calendarEvent.create({
      data: {
        gymId,
        courseId: kickboxen.id,
        locationId: essen.id,
        startsAt: at(addDays(today, 4), hourBase),
        endsAt: at(addDays(today, 4), hourBase + 1),
        capacity: 3,
      },
    });
    await fillSeats(e.id, 3);

    // E2) Ungebucht, komplett voll, naechste Woche (Dienstag) - im
    // Unterschied zu E ist hier das Wochenkontingent noch nicht ausgeschoepft
    // (A+B verbrauchen es nur fuer DIESE Woche), der "Warteliste"-Button ist
    // also anklickbar statt durch "Wochenlimit erreicht" blockiert
    // (Gegenstueck zu E). "Naechster Dienstag" statt eines festen Offsets,
    // damit der Termin unabhaengig vom Wochentag des Seed-Laufs innerhalb
    // des sichtbaren Zwei-Wochen-Fensters bleibt (siehe api/mobile/courses).
    const e2Dow = today.getDay(); // 0=So..6=Sa
    const e2NextMonday = addDays(today, e2Dow === 0 ? 1 : 8 - e2Dow);
    const e2Date = addDays(e2NextMonday, 1);
    const e2 = await prisma.calendarEvent.create({
      data: {
        gymId,
        courseId: kickboxen.id,
        locationId: essen.id,
        startsAt: at(e2Date, hourBase),
        endsAt: at(e2Date, hourBase + 1),
        capacity: 3,
      },
    });
    await fillSeats(e2.id, 3);

    // F) Ungebucht, frei (gruen) - liegt bewusst auf den letzten Tag dieser
    // Kalenderwoche, damit sie unabhaengig vom Wochentag des Seed-Laufs
    // "diese Woche" bleibt. Bei Vertrags-Kunden (Kontingent durch A+B
    // bereits erreicht) zeigt die Karte "Kontingent voll" + "Naechste Woche
    // buchen" - Rueckenfit hat dank des allgemeinen Stundenplans auch
    // naechste Woche Termine, an die der Link scrollen kann.
    const dow = today.getDay(); // 0=So..6=Sa
    const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
    const fDate = daysUntilSunday === 0 ? addDays(today, 1) : addDays(today, daysUntilSunday);
    const f = await prisma.calendarEvent.create({
      data: {
        gymId,
        courseId: ruecken.id,
        locationId: essen.id,
        startsAt: at(fDate, hourBase),
        endsAt: at(fDate, hourBase + 1),
        capacity: 10,
      },
    });
    await fillSeats(f.id, 1);

    // G) Vergangene Buchung ("Bereits besucht") - muss innerhalb der
    // aktuellen Kalenderwoche liegen, sonst filtert /api/mobile/bookings sie
    // weg (siehe dortiger Kommentar in der Route).
    const thisMonday = addDays(today, dow === 0 ? -6 : 1 - dow);
    const g = await prisma.calendarEvent.create({
      data: {
        gymId,
        courseId: zumba.id,
        locationId: essen.id,
        startsAt: at(thisMonday, hourBase - 4),
        endsAt: at(thisMonday, hourBase - 3),
        capacity: 10,
      },
    });
    await prisma.booking.create({ data: { gymId, calendarEventId: g.id, customerId, status: "BOOKED" } });

    // H) Stammkurs: Yoga Flow (wie A) bekommt zwei weitere vergangene
    // Buchungen, damit der Mindest-Schwellwert (MIN_BOOKINGS=2, siehe
    // /api/mobile/favorites) erreicht wird. A liefert dazu automatisch den
    // anstehenden Termin fuer die Stammkurs-Karte auf dem Start-Tab.
    for (const weeksAgo of [2, 3]) {
      const pastDate = addDays(today, -weeksAgo * 7);
      const yogaPast = await prisma.calendarEvent.create({
        data: {
          gymId,
          courseId: yoga.id,
          locationId: essen.id,
          startsAt: at(pastDate, hourBase),
          endsAt: at(pastDate, hourBase + 1),
          capacity: 10,
        },
      });
      await prisma.booking.create({ data: { gymId, calendarEventId: yogaPast.id, customerId, status: "BOOKED" } });
    }

    // I) Gebuchtes Event (Tag der offenen Tuer) - das ungebuchte Gegenstueck
    // existiert bereits global (naechsten Sonntag, siehe oben).
    const i = await prisma.calendarEvent.create({
      data: {
        gymId,
        eventId: openDay.id,
        locationId: essen.id,
        startsAt: at(addDays(today, 4), hourBase + 8),
        endsAt: at(addDays(today, 4), hourBase + 10),
        capacity: openDay.participantLimit,
      },
    });
    await prisma.booking.create({ data: { gymId, calendarEventId: i.id, customerId, status: "BOOKED" } });
  }

  await seedMobileTestScenarios(testVertrag.id, 12);
  await seedMobileTestScenarios(testGutschein.id, 13);
  await seedMobileTestScenarios(testProbetraining.id, 14);

  // --- News -----------------------------------------------------
  await prisma.news.create({
    data: {
      gymId,
      subject: "Neue Öffnungszeiten ab August",
      message:
        "Liebe Mitglieder, ab dem 1. August gelten in beiden Studios neue Öffnungszeiten...",
      status: "SENT",
      sentAt: d(2026, 7, 1),
      publishOnWebsite: true,
      locations: { connect: [{ id: essen.id }, { id: duesseldorf.id }] },
    },
  });

  await prisma.news.create({
    data: {
      gymId,
      subject: "Sommer-Challenge startet",
      message: "Entwurf: Details zur Sommer-Challenge folgen.",
      status: "DRAFT",
    },
  });

  await prisma.news.create({
    data: {
      gymId,
      subject: "Renovierung Standort Essen abgeschlossen",
      message: "Die Renovierungsarbeiten in Essen sind abgeschlossen.",
      status: "ARCHIVED",
      sentAt: d(2026, 3, 1),
      locations: { connect: [{ id: essen.id }] },
    },
  });

  await prisma.news.create({
    data: {
      gymId,
      subject: "Neuer Kurs: Bootcamp",
      message: "Ab sofort im Kursplan: Bootcamp, montags und donnerstags um 07:00 Uhr.",
      status: "SENT",
      sentAt: d(2026, 7, 5),
      publishOnFacebook: true,
      publishOnInstagram: true,
      attachments: {
        create: [
          {
            gymId,
            fileName: "bootcamp-flyer.jpg",
            url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800",
          },
        ],
      },
    },
  });

  // --- E-Mail-Texte -----------------------------------------------------
  await prisma.emailTemplate.createMany({
    data: [
      {
        gymId,
        category: "PERSON",
        label: "Geburtstag",
        body: "Liebe/r {{Vorname}}, das gesamte BEEPLUS-Team wünscht dir alles Gute zum Geburtstag!",
      },
      {
        gymId,
        category: "PERSON",
        label: "Herausforderung",
        body: "Hallo {{Vorname}}, wir haben eine neue Challenge für dich - bist du dabei?",
      },
      {
        gymId,
        category: "PERSON",
        label: "Gutschein Ablauf",
        body: "Hallo {{Vorname}}, dein Gutschein läuft bald ab. Nutze deine verbleibenden Einheiten rechtzeitig.",
      },
      {
        gymId,
        category: "PERSON",
        label: "Gutschein Kurse",
        body: "Hallo {{Vorname}}, dir stehen noch {{Kursanzahl}} Einheiten auf deinem Gutschein zur Verfügung.",
      },
      {
        gymId,
        category: "PERSON",
        label: "Einladung zum Probetraining",
        body: "Hallo {{Vorname}}, wir laden dich herzlich zu deinem Probetraining am {{Datum}} ein.",
      },
      {
        gymId,
        category: "CALENDAR",
        label: "Trainingserinnerung",
        body: "Hallo {{Vorname}}, dein Kurs {{Kurs}} beginnt morgen um {{Uhrzeit}} Uhr.",
      },
      {
        gymId,
        category: "CALENDAR",
        label: "Warteliste (Platz frei)",
        body: "Hallo {{Vorname}}, für den Kurs {{Kurs}} ist ein Platz frei geworden - sichere dir jetzt deinen Platz in der App.",
      },
      {
        gymId,
        category: "CALENDAR",
        label: "Wir vermissen dich",
        body: "Hallo {{Vorname}}, wir haben dich schon eine Weile nicht mehr im Studio gesehen. Alles in Ordnung?",
      },
      {
        gymId,
        category: "BILLING",
        label: "Rechnung senden",
        body: "Hallo {{Vorname}}, anbei erhältst du deine Rechnung über {{Betrag}} für den Zeitraum {{Zeitraum}}.",
      },
      {
        gymId,
        category: "BILLING",
        label: "Mahnung senden",
        body: "Hallo {{Vorname}}, leider konnten wir den Betrag von {{Betrag}} nicht einziehen. Bitte gleiche den Betrag zeitnah aus.",
      },
    ],
  });

  // --- Plattform-Admin -----------------------------------------------------
  const platformAdmin = await prisma.platformAdmin.create({
    data: {
      firstName: "Plattform",
      lastName: "Admin",
      email: "platform-admin@beeplus.de",
      passwordHash: hash("platform-admin"),
    },
  });

  console.log("Seeding abgeschlossen.");
  console.log(`Gym: ${gym.name} (${gym.slug})`);
  console.log(`Admin-Login: ${admin.email} / beeplus-admin`);
  console.log(`Weitere Mitarbeiter-Logins: *.@beeplus.de / training123`);
  console.log(`Plattform-Admin-Login (/platform/login): ${platformAdmin.email} / platform-admin`);
  console.log("Mobile-App-Testkonten (OTP-Login, Code steht im Server-Log):");
  console.log(`  Vertrag:       ${testVertrag.email}`);
  console.log(`  Gutschein:     ${testGutschein.email}`);
  console.log(`  Probetraining: ${testProbetraining.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
