import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { directPrisma } from "./prisma-direct";
import { prisma } from "./prisma";
import { withGymScope } from "./scoped-prisma";

// Sicherheitstest fuer die Mandantentrennung (siehe schema.prisma
// Kopfkommentar und scoped-prisma.ts) - kein reiner Unit-Test, sondern eine
// echte Integration gegen Postgres inkl. Row-Level-Security. Legt zwei
// vollstaendig unabhaengige Test-Gyms an und prueft, dass keines der beiden
// jemals Daten des anderen lesen, aendern oder loeschen kann - das ist die
// "hoechste Praemisse" aus den Projektanforderungen, nicht nur ein Detail.

describe("Mandantentrennung (RLS + Scoped-Prisma-Client)", () => {
  let gymA: { id: string };
  let gymB: { id: string };
  let locationA: { id: string };
  let customerA: { id: string };
  let customerB: { id: string };

  beforeAll(async () => {
    const suffix = Date.now();
    gymA = await directPrisma.gym.create({
      data: { name: "Test-Sicherheit Gym A", slug: `test-security-gym-a-${suffix}` },
    });
    gymB = await directPrisma.gym.create({
      data: { name: "Test-Sicherheit Gym B", slug: `test-security-gym-b-${suffix}` },
    });

    locationA = await directPrisma.location.create({
      data: { gymId: gymA.id, city: "A-Stadt", street: "A-Straße 1", zip: "11111" },
    });
    const locationB = await directPrisma.location.create({
      data: { gymId: gymB.id, city: "B-Stadt", street: "B-Straße 1", zip: "22222" },
    });

    customerA = await directPrisma.customer.create({
      data: {
        gymId: gymA.id,
        firstName: "Anna",
        lastName: "Testperson",
        gender: "w",
        birthday: new Date(1990, 0, 1),
        status: "ACTIVE",
        contractType: "TRIAL",
        locations: { connect: [{ id: locationA.id }] },
        joinedAt: new Date(),
      },
    });
    customerB = await directPrisma.customer.create({
      data: {
        gymId: gymB.id,
        firstName: "Bernd",
        lastName: "Testperson",
        gender: "m",
        birthday: new Date(1990, 0, 1),
        status: "ACTIVE",
        contractType: "TRIAL",
        locations: { connect: [{ id: locationB.id }] },
        joinedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await directPrisma.customer.deleteMany({ where: { gymId: { in: [gymA.id, gymB.id] } } });
    await directPrisma.location.deleteMany({ where: { gymId: { in: [gymA.id, gymB.id] } } });
    await directPrisma.gym.deleteMany({ where: { id: { in: [gymA.id, gymB.id] } } });
    await directPrisma.$disconnect();
    await prisma.$disconnect();
  });

  it("liefert ohne gesetzten Gym-Kontext gar keine Zeilen (fail closed)", async () => {
    const rows = await prisma.customer.findMany({ where: { id: customerA.id } });
    expect(rows).toHaveLength(0);
  });

  it("Gym A sieht in findMany() nur eigene Kunden, nie die von Gym B", async () => {
    const result = await withGymScope(gymA.id, (db) => db.customer.findMany());
    const ids = result.map((c) => c.id);
    expect(ids).toContain(customerA.id);
    expect(ids).not.toContain(customerB.id);
  });

  it("Gym A kann einen Kunden von Gym B nicht per ID lesen", async () => {
    const result = await withGymScope(gymA.id, (db) =>
      db.customer.findUnique({ where: { id: customerB.id } }),
    );
    expect(result).toBeNull();
  });

  it("Gym A kann einen Kunden von Gym B nicht aktualisieren", async () => {
    const result = await withGymScope(gymA.id, (db) =>
      db.customer.updateMany({ where: { id: customerB.id }, data: { notes: "manipuliert" } }),
    );
    expect(result.count).toBe(0);

    const unchanged = await directPrisma.customer.findUnique({ where: { id: customerB.id } });
    expect(unchanged?.notes).not.toBe("manipuliert");
  });

  it("Gym A kann einen Kunden von Gym B nicht löschen", async () => {
    const result = await withGymScope(gymA.id, (db) =>
      db.customer.deleteMany({ where: { id: customerB.id } }),
    );
    expect(result.count).toBe(0);

    const stillExists = await directPrisma.customer.findUnique({ where: { id: customerB.id } });
    expect(stillExists).not.toBeNull();
  });

  it("erzwingt die eigene gymId beim Anlegen, selbst wenn eine fremde gymId übergeben wird", async () => {
    const created = await withGymScope(gymA.id, (db) =>
      db.customer.create({
        data: {
          gymId: gymB.id, // absichtlich falsch - simuliert einen Bug/Manipulationsversuch
          firstName: "Eve",
          lastName: "Angreiferin",
          gender: "w",
          birthday: new Date(1990, 0, 1),
          status: "ACTIVE",
          contractType: "TRIAL",
          locations: { connect: [{ id: locationA.id }] },
          joinedAt: new Date(),
        },
      }),
    );

    expect(created.gymId).toBe(gymA.id);

    await directPrisma.customer.delete({ where: { id: created.id } });
  });
});
