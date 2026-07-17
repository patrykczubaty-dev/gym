import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Bewusste, eng begrenzte Ausnahme von der RLS-Regel: verbindet als
// privilegierter DB-Owner und umgeht damit Row-Level-Security. Ausschliesslich
// fuer Identitaets-Lookups verwenden, bei denen die gymId per Definition noch
// nicht bekannt ist (Login per E-Mail, Passwort-Reset per Token) - niemals
// fuer allgemeinen Datenzugriff. Jede andere Stelle im Code muss
// getScopedPrisma()/withGymScope() aus scoped-prisma.ts verwenden.

const globalForPrisma = globalThis as unknown as {
  directPrisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_DATABASE_URL! });

export const directPrisma = globalForPrisma.directPrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.directPrisma = directPrisma;
}
