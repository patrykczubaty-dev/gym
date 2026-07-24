import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Oeffentliche, unauthentifizierte Seite (siehe proxy.ts PUBLIC_ROUTES) - von
// der Mobile App aus verlinkt (Profil-Tab) und fuer Website-Besucher gedacht.
// WICHTIG: Platzhalterinhalt. Die eckigen Klammern muessen vor dem
// Livegang durch die echten Angaben des Studio-Betreibers ersetzt werden
// (Pflichtangaben nach §5 TMG) - hier duerfen keine erfundenen Fakten stehen.
export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/login" className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Zurück
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">Impressum</h1>
      <div className="space-y-4 text-sm text-foreground">
        <section>
          <h2 className="font-medium">Angaben gemäß § 5 TMG</h2>
          <p className="text-muted-foreground">
            [Firmenname]
            <br />
            [Straße und Hausnummer]
            <br />
            [PLZ und Ort]
          </p>
        </section>
        <section>
          <h2 className="font-medium">Vertreten durch</h2>
          <p className="text-muted-foreground">[Name der/des Geschäftsführenden]</p>
        </section>
        <section>
          <h2 className="font-medium">Kontakt</h2>
          <p className="text-muted-foreground">
            Telefon: [Telefonnummer]
            <br />
            E-Mail: [E-Mail-Adresse]
          </p>
        </section>
        <section>
          <h2 className="font-medium">Registereintrag</h2>
          <p className="text-muted-foreground">
            [Falls zutreffend: Handelsregister, Registergericht, Registernummer]
          </p>
        </section>
        <section>
          <h2 className="font-medium">Umsatzsteuer-ID</h2>
          <p className="text-muted-foreground">
            [Falls zutreffend: USt-IdNr. gemäß § 27 a Umsatzsteuergesetz]
          </p>
        </section>
      </div>
    </div>
  );
}
