import { prisma } from "@/lib/prisma";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { EmailTemplateForm } from "@/components/email-templates/email-template-form";

const CATEGORY_LABEL: Record<string, string> = {
  PERSON: "Person",
  CALENDAR: "Kalender",
  BILLING: "Rechnungswesen",
};

export default async function EmailTemplatesPage() {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { label: "asc" } });

  const categories = ["PERSON", "CALENDAR", "BILLING"];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">E-Mail-Texte</h1>
      <Tabs defaultValue="PERSON">
        <TabsList>
          {categories.map((c) => (
            <TabsTrigger key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </TabsTrigger>
          ))}
        </TabsList>
        {categories.map((c) => (
          <TabsContent key={c} value={c} className="space-y-3">
            {templates
              .filter((t) => t.category === c)
              .map((t) => (
                <EmailTemplateForm key={t.id} id={t.id} label={t.label} body={t.body} />
              ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
