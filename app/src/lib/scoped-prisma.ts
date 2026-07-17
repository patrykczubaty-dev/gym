import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Mandantentrennung mit zwei unabhaengigen Sicherheitsebenen (siehe
// prisma/schema.prisma Kopfkommentar):
//
//   1. Diese Prisma Client Extension haengt gymId automatisch an JEDE Query
//      (lesend UND schreibend) fuer die unten gelisteten Modelle - ein
//      Server Action/Seiten-Code kann den Filter nicht vergessen, weil er
//      nie manuell geschrieben wird.
//   2. withGymScope() fuehrt zusaetzlich JEDE Anfrage in einer Transaktion
//      aus, die zu Beginn Postgres' Row-Level-Security-Session-Variable
//      setzt. Selbst wenn Ebene 1 einen Fehler haette (z.B. ein neues Modell
//      wird vergessen in GYM_SCOPED_MODELS einzutragen), wuerde die
//      Datenbank selbst den Zugriff auf fremde Zeilen verweigern.
//
// Ausnahme bewusst: Gym und PlatformAdmin sind NICHT gym-gebunden (Gym ist
// der Mandant selbst, PlatformAdmin steht ausserhalb jedes Mandanten).

const GYM_SCOPED_MODELS = new Set([
  "Location",
  "Employee",
  "EmployeePayout",
  "Customer",
  "CustomerBankAccount",
  "SepaDebit",
  "ContractPlan",
  "ContractDetail",
  "VoucherType",
  "VoucherAssignment",
  "Course",
  "Event",
  "CalendarEvent",
  "Booking",
  "Trial",
  "TrialProposedSlot",
  "News",
  "NewsAttachment",
  "EmailTemplate",
  "Settings",
]);

// Operationen, bei denen gymId in die WHERE-Bedingung injiziert wird
// (verhindert Lesen/Aendern/Loeschen fremder Zeilen).
const WHERE_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
  "upsert",
]);

// Operationen, bei denen gymId in die zu schreibenden Daten injiziert wird
// (verhindert, dass Zeilen ohne/mit falscher gymId angelegt werden).
const DATA_OPERATIONS = new Set(["create", "createMany"]);

function withGymId<T extends Record<string, unknown>>(
  where: T | undefined,
  gymId: string,
): T {
  return { ...(where ?? {}), gymId } as unknown as T;
}

function gymScopeExtension(gymId: string) {
  return Prisma.defineExtension({
    name: "gym-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !GYM_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const a = args as Record<string, unknown>;

          if (WHERE_OPERATIONS.has(operation)) {
            a.where = withGymId(a.where as Record<string, unknown>, gymId);
          }

          if (operation === "upsert") {
            a.create = withGymId(a.create as Record<string, unknown>, gymId);
          }

          if (DATA_OPERATIONS.has(operation)) {
            if (Array.isArray(a.data)) {
              a.data = a.data.map((d: Record<string, unknown>) => withGymId(d, gymId));
            } else {
              a.data = withGymId(a.data as Record<string, unknown>, gymId);
            }
          }

          return query(a);
        },
      },
    },
  });
}

export type ScopedPrisma = ReturnType<typeof buildScopedClient>;

function buildScopedClient(gymId: string) {
  return prisma.$extends(gymScopeExtension(gymId));
}

// WICHTIG (empirisch verifiziert): Da RLS mit FORCE ROW LEVEL SECURITY lief,
// blockiert Postgres OHNE gesetzte app.current_gym_id-Session-Variable JEDE
// Zeile - auch bei korrektem WHERE-Filter aus Ebene 1. Es gibt deshalb
// bewusst KEINE Variante, die nur Ebene 1 ohne die Transaktion aus
// withGymScope() nutzt (das wuerde fuer Lesezugriffe still leere Ergebnisse
// liefern statt eines Fehlers). Jeder Datenbankzugriff - lesend wie
// schreibend - MUSS durch withGymScope() laufen.
export async function withGymScope<T>(
  gymId: string,
  callback: (db: ScopedPrisma) => Promise<T>,
): Promise<T> {
  const scoped = buildScopedClient(gymId);
  return scoped.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_gym_id', ${gymId}, true)`;
    return callback(tx as unknown as ScopedPrisma);
  });
}
