"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { withGymScope } from "@/lib/scoped-prisma";
import { verifySession } from "@/lib/dal";

export type ActionState = { error: string } | undefined;

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, { error: "Neues Passwort muss mindestens 6 Zeichen haben." }),
});

export async function changePassword(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await verifySession();

  const validated = Schema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!validated.success) return { error: "Bitte beide Felder ausfüllen (mind. 6 Zeichen)." };

  const result = await withGymScope(session.gymId, async (db) => {
    const employee = await db.employee.findUniqueOrThrow({
      where: { id: session.employeeId },
    });

    const matches = await bcrypt.compare(validated.data.currentPassword, employee.passwordHash);
    if (!matches) return { error: "Aktuelles Passwort ist falsch." };

    await db.employee.update({
      where: { id: employee.id },
      data: { passwordHash: bcrypt.hashSync(validated.data.newPassword, 10) },
    });
    return undefined;
  });

  return result;
}
