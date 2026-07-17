import { withGymScope } from "@/lib/scoped-prisma";
import { getCurrentEmployee } from "@/lib/dal";
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

const AVAILABLE_VARIABLES: { name: string; description: string }[] = [
  { name: "{{Studioname}}", description: "Name des Gyms (ersetzt „BEEPLUS“)" },
  { name: "{{Vorname}}", description: "Vorname des Kunden" },
  { name: "{{Kurs}}", description: "Titel des Kurses" },
  { name: "{{Uhrzeit}}", description: "Uhrzeit des Kalendertermins" },
  { name: "{{Datum}}", description: "Datum (z. B. Probetraining-Termin)" },
  { name: "{{Kursanzahl}}", description: "Verbleibende Gutschein-Einheiten" },
  { name: "{{Betrag}}", description: "Rechnungs- bzw. Mahnbetrag" },
  { name: "{{Zeitraum}}", description: "Abrechnungszeitraum" },
];

export default async function EmailTemplatesPage() {
  const { gymId } = await getCurrentEmployee();
  const templates = await withGymScope(gymId, (db) =>
    db.emailTemplate.findMany({ orderBy: { label: "asc" } }),
  );

  const categories = ["PERSON", "CALENDAR", "BILLING"];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">E-Mail-Texte</h1>

      <div className="rounded-lg border bg-background p-4">
        <p className="text-sm text-muted-foreground">
          Variablen werden beim Versenden automatisch ersetzt. Nicht jede Variable ist in jedem
          Text sinnvoll — verfügbar sind:
        </p>
        <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
          {AVAILABLE_VARIABLES.map((v) => (
            <div key={v.name} className="flex gap-1.5">
              <dt>
                <code className="rounded bg-muted px-1 py-0.5 font-mono">{v.name}</code>
              </dt>
              <dd className="text-muted-foreground">{v.description}</dd>
            </div>
          ))}
        </dl>
      </div>

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
