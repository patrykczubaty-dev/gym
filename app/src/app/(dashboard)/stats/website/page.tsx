import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WebsiteStatsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Website-Statistiken</h1>
      <Card>
        <CardHeader>
          <CardTitle>Noch nicht implementiert</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Eine Web-Analytics-Integration (z. B. Piwik) ist in diesem ersten Entwurf noch nicht
          angebunden.
        </CardContent>
      </Card>
    </div>
  );
}
