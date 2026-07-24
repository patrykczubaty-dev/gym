import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Siehe Kommentar in impressum/page.tsx - ebenfalls Platzhalterinhalt, muss
// vor Livegang durch eine echte, rechtlich geprüfte Datenschutzerklärung
// ersetzt werden (Art. 13 DSGVO: welche Daten, wofür, wie lange, welche
// Rechte). Diese App verarbeitet insbesondere Kontaktdaten, Buchungs- und
// Vertragsdaten der Mitglieder - eine pauschale Vorlage reicht dafür nicht.
export default function DatenschutzPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/login" className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Zurück
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">Datenschutzerklärung</h1>
      <div className="space-y-4 text-sm text-foreground">
        <section>
          <h2 className="font-medium">Verantwortliche Stelle</h2>
          <p className="text-muted-foreground">
            [Firmenname, Anschrift, Kontakt - siehe Impressum]
          </p>
        </section>
        <section>
          <h2 className="font-medium">Welche Daten wir verarbeiten</h2>
          <p className="text-muted-foreground">
            [Auflisten: Kontaktdaten, Vertrags-/Buchungsdaten, Nutzungsdaten der App usw.]
          </p>
        </section>
        <section>
          <h2 className="font-medium">Zweck der Verarbeitung</h2>
          <p className="text-muted-foreground">
            [Z.B. Vertragsabwicklung, Kursbuchung, Mitgliederverwaltung]
          </p>
        </section>
        <section>
          <h2 className="font-medium">Rechte der betroffenen Personen</h2>
          <p className="text-muted-foreground">
            [Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch, Datenübertragbarkeit gemäß Art. 15-21 DSGVO]
          </p>
        </section>
      </div>
    </div>
  );
}
