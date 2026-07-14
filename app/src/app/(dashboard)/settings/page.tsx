import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/dal";
import { SettingsForm } from "@/components/settings/settings-form";
import { SocialApiForm } from "@/components/settings/social-api-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const employee = await getCurrentEmployee();

  if (!employee.permAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Systeme</h1>
        <p className="text-muted-foreground">
          Dieser Bereich ist nur für Administratoren zugänglich.
        </p>
      </div>
    );
  }

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Systeme</h1>
      <SettingsForm
        defaultNoticePeriodMonths={settings.defaultNoticePeriodMonths}
        defaultAutoRenewalMonths={settings.defaultAutoRenewalMonths}
      />
      <div>
        <h2 className="mb-2 font-medium">Facebook &amp; Instagram API</h2>
        <SocialApiForm
          facebookPageId={settings.facebookPageId}
          facebookAccessToken={settings.facebookAccessToken}
          instagramBusinessAccountId={settings.instagramBusinessAccountId}
          instagramAccessToken={settings.instagramAccessToken}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Weitere Systemfunktionen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Folgende Punkte sind bewusst noch nicht Teil dieses ersten Entwurfs:</p>
          <ul className="list-inside list-disc">
            <li>Anlegen-/Löschen-Log (Audit-Log)</li>
            <li>Tatsächlicher API-Aufruf an Facebook/Instagram beim Veröffentlichen von News</li>
            <li>Automatischer E-Mail-Versand (Geburtstag, Trainingserinnerung, Mahnungen)</li>
            <li>Piwik / Web-Analytics</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
