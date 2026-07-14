import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CustomerStatsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Kunden-Statistiken</h1>
      <Card>
        <CardHeader>
          <CardTitle>Noch nicht implementiert</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Auswertungen zu Stoßzeiten, Buchungsverhalten und beliebtesten Kursen/Dienstleistungen
          folgen in einer späteren Ausbaustufe.
        </CardContent>
      </Card>
    </div>
  );
}
