"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withGymScope } from "@/lib/scoped-prisma";
import { checkPermission } from "@/lib/permissions";
import { getCurrentEmployee } from "@/lib/dal";

export type ActionState = { error: string } | undefined;

const Schema = z.object({
  body: z.string().min(1, { error: "Text darf nicht leer sein." }),
});

export async function updateEmailTemplate(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const permError = await checkPermission("permEmailTemplates");
  if (permError) return permError;
  const validated = Schema.safeParse({ body: formData.get("body") });
  if (!validated.success) return { error: "Text darf nicht leer sein." };

  const { gymId } = await getCurrentEmployee();
  await withGymScope(gymId, (db) =>
    db.emailTemplate.update({ where: { id }, data: validated.data }),
  );
  revalidatePath("/email-templates");
}
