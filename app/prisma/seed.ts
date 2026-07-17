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
      locationId: essen.id,
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
      locationId: essen.id,
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
      locationId: duesseldorf.id,
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
      locationId: essen.id,
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
      locationId: duesseldorf.id,
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
      locationId: essen.id,
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
      locationId: essen.id,
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
      locationId: duesseldorf.id,
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
      locationId: essen.id,
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
      locationId: duesseldorf.id,
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
      locationId: essen.id,
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
      locationId: duesseldorf.id,
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
      locationId: essen.id,
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
      locationId: essen.id,
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
      locationId: duesseldorf.id,
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
      locationId: duesseldorf.id,
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
      locationId: essen.id,
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
  const week1Mon = d(2026, 7, 13);
  const week1Thu = d(2026, 7, 16);
  const week2Mon = d(2026, 7, 20);

  function at(date: Date, hour: number) {
    const copy = new Date(date);
    copy.setHours(hour, 0, 0, 0);
    return copy;
  }

  const events: {
    course: typeof yoga;
    location: typeof essen;
    date: Date;
    hour: number;
    capacity: number;
  }[] = [
    { course: yoga, location: essen, date: week1Mon, hour: 9, capacity: 12 },
    { course: yoga, location: duesseldorf, date: week1Thu, hour: 9, capacity: 12 },
    { course: yoga, location: essen, date: week2Mon, hour: 9, capacity: 12 },
    { course: crossfit, location: essen, date: week1Mon, hour: 18, capacity: 10 },
    { course: crossfit, location: essen, date: week1Thu, hour: 18, capacity: 10 },
    { course: crossfit, location: essen, date: week2Mon, hour: 18, capacity: 10 },
    { course: ruecken, location: duesseldorf, date: week1Mon, hour: 10, capacity: 15 },
    { course: ruecken, location: duesseldorf, date: week1Thu, hour: 10, capacity: 15 },
    { course: ruecken, location: duesseldorf, date: week2Mon, hour: 10, capacity: 15 },
    { course: zumba, location: essen, date: week1Mon, hour: 19, capacity: 20 },
    { course: zumba, location: duesseldorf, date: week1Thu, hour: 19, capacity: 20 },
    { course: zumba, location: essen, date: week2Mon, hour: 19, capacity: 20 },
    { course: bootcamp, location: essen, date: week1Mon, hour: 7, capacity: 8 },
    { course: bootcamp, location: essen, date: week1Thu, hour: 7, capacity: 8 },
    { course: bootcamp, location: essen, date: week2Mon, hour: 7, capacity: 8 },
  ];

  const createdEvents: { id: string }[] = [];
  for (const e of events) {
    const startsAt = at(e.date, e.hour);
    const endsAt = at(e.date, e.hour + 1);
    const event = await prisma.calendarEvent.create({
      data: {
        gymId,
        courseId: e.course.id,
        locationId: e.location.id,
        startsAt,
        endsAt,
        capacity: e.capacity,
      },
    });
    createdEvents.push(event);
  }

  // Standalone Event-Termin (kein Kurs) - Sonntag der aktuellen Woche.
  await prisma.calendarEvent.create({
    data: {
      gymId,
      eventId: openDay.id,
      locationId: essen.id,
      startsAt: at(d(2026, 7, 19), 11),
      endsAt: at(d(2026, 7, 19), 15),
      capacity: openDay.participantLimit,
    },
  });

  const bookingCustomers = [sabine, ben, nina, jonas, mira, paul, katrin, felix];

  // grüner Termin: wenige Buchungen
  await prisma.booking.createMany({
    data: [sabine, ben, nina].map((c) => ({
      gymId,
      calendarEventId: createdEvents[0].id,
      customerId: c.id,
      status: "BOOKED",
    })),
  });

  // gelber Termin: fast voll (9 von 10 Plätzen)
  await prisma.booking.createMany({
    data: bookingCustomers.slice(0, 8).map((c) => ({
      gymId,
      calendarEventId: createdEvents[3].id,
      customerId: c.id,
      status: "BOOKED",
    })),
  });
  await prisma.booking.create({
    data: { gymId, calendarEventId: createdEvents[3].id, customerId: jonas.id, status: "BOOKED" },
  });

  // roter Termin: komplett voll + 2 Personen auf der Warteliste
  await prisma.booking.createMany({
    data: [sabine, ben, nina, jonas, mira, david, hannah, erik, juliaVogt, felix].map(
      (c) => ({
        gymId,
        calendarEventId: createdEvents[4].id,
        customerId: c.id,
        status: "BOOKED",
      }),
    ),
  });
  await prisma.booking.create({
    data: {
      gymId,
      calendarEventId: createdEvents[4].id,
      customerId: paul.id,
      status: "WAITLISTED",
      waitlistPosition: 1,
    },
  });
  await prisma.booking.create({
    data: {
      gymId,
      calendarEventId: createdEvents[4].id,
      customerId: katrin.id,
      status: "WAITLISTED",
      waitlistPosition: 2,
    },
  });

  // ein paar weitere lockere Buchungen zur Auflockerung
  await prisma.booking.createMany({
    data: [
      { gymId, calendarEventId: createdEvents[6].id, customerId: mira.id, status: "BOOKED" },
      { gymId, calendarEventId: createdEvents[6].id, customerId: nina.id, status: "BOOKED" },
      { gymId, calendarEventId: createdEvents[9].id, customerId: felix.id, status: "BOOKED" },
    ],
  });

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
        body: "Hallo {{Vorname}}, für den Kurs {{Kurs}} ist ein Platz frei geworden - du bist automatisch angemeldet.",
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
