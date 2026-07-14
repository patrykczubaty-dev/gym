# BEEPLUS

Erster Entwurf der BEEPLUS Gym-Management-Webapplikation. Next.js (App Router) +
TypeScript, Prisma/SQLite, Tailwind CSS + shadcn/ui (Base UI). Siehe
[`../gymproject.md`](../gymproject.md) für das zugrunde liegende Fachkonzept
(inkl. der Kündigungs-/Verlängerungslogik für Langzeitverträge) und
[`../gym_software/`](../gym_software/) für den alten statischen HTML-Prototyp,
der als visuelle/fachliche Referenz diente.

## Setup

```bash
npm install
cp .env.example .env
# .env: SESSION_SECRET durch eine echte Zufalls-Zeichenkette ersetzen, z. B.:
openssl rand -base64 32

npx prisma migrate dev   # Datenbank anlegen/migrieren
npx prisma db seed       # Beispieldaten einspielen

npm run dev              # http://localhost:3000
```

**Demo-Login** (aus dem Seed-Skript): `admin@beeplus.de` / `beeplus-admin`
(Administrator, sieht alle Module). Weitere Mitarbeiter-Logins:
`markus.vogel@beeplus.de`, `julia.krueger@beeplus.de`, `tom.nowak@beeplus.de`,
`lena.schmidt@beeplus.de`, jeweils mit Passwort `training123` und
unterschiedlichen, eingeschränkten Berechtigungen (siehe Sidebar-Ausblendung).

## Weitere Befehle

```bash
npm test              # vitest (Business-Logik-Tests: Kündigung, Ampel, Warteliste)
npm run test:watch    # vitest im Watch-Modus
npm run lint          # eslint
npx prisma studio     # Datenbank-Browser
npx prisma migrate dev --name <name>   # neue Migration nach Schema-Änderung
```

## Architektur

- `src/lib/core/` — reine, framework-unabhängige Business-Logik (kein Prisma-/Next-Import):
  - `cancellation.ts` — Kündigungs-/Verlängerungsberechnung für Langzeitverträge, getestet
    gegen die drei Beispielrechnungen aus `gymproject.md`.
  - `occupancy.ts` — Ampel-Status für Kalendertermine (grün/gelb/rot).
  - `waitlist.ts` — Wartelisten-Nachrück-Logik.
- `src/lib/` — Prisma-Client-Singleton, Session-Handling (`jose`-basierte JWT-Cookies,
  kein Auth.js), DAL (`dal.ts`, zentraler Auth-Check), Berechtigungsprüfung
  (`permissions.ts`).
- `src/proxy.ts` — Next.js 16 "Proxy" (ehemals Middleware): optimistischer Auth-Redirect.
- `src/server/actions/` — Server Actions je Modul, mutieren über Prisma und prüfen
  Berechtigungen (`checkPermission`) sowie fachliche Regeln (z. B. "Standort nur ohne
  zugeordnete Kunden löschbar").
- `src/app/(dashboard)/` — die 12 Fachmodule (Standorte, Mitarbeiter, Kunden, Kurse,
  Kalender, Probetrainings, Gutscheine, News, E-Mail-Texte, SEPA, Statistiken, Systeme)
  hinter der gemeinsamen Sidebar/Topbar-Shell.
- `prisma/schema.prisma` — Datenmodell. SQLite kennt keine nativen Enums, daher sind
  Enum-Felder als `String` modelliert; die erlaubten Werte stehen in `src/lib/enums.ts`
  (zod-Enums). Geldbeträge sind `Int` in Cent (`src/lib/money.ts`).
- `prisma/seed.ts` — Beispieldaten, u. a. drei Kunden, die exakt die drei
  Kündigungsbeispiele aus `gymproject.md` nachbilden (Sabine Hoffmann, Ben Fischer,
  Nina Krause) — dient als lebender Beweis, dass die Berechnung korrekt verdrahtet ist.

## Bekannte Lücken im ersten Entwurf (bewusst nicht enthalten)

- Echter SEPA-Dateiexport an eine Bank (nur Datenmodell + Sammelübersicht unter `/sepa`)
- SEPA-Mandat-PDF- und Kündigungs-PDF-Generierung (Buttons sind Stubs)
- Feiertags-API-Integration im Kalender
- Facebook-/Website-Publish-API für News (nur Flags speicherbar)
- Automatischer E-Mail-Versand (Geburtstag, Trainingserinnerung, Mahnungen, Warteliste
  frei) — Templates mit Platzhaltern sind vorbereitet, aber ohne SMTP/Cron-Anbindung
- Öffentliches Probetraining-Anmeldeformular auf einer Website (nur der interne
  Bearbeitungs-Flow inkl. Zusage-/Absage-Link unter `/api/trial-response/[token]`)
- Foto-Upload (aktuell nur eine Bild-URL hinterlegbar)
- Kalender-Drag&Drop, Anlegen-/Löschen-Audit-Log
- Kunden-/Website-Statistiken (Platzhalterseiten unter `/stats`)
- Feingranulare Berechtigungsprüfung ist auf jede Server Action verdrahtet, aber
  Seiten selbst (Server Components) prüfen Berechtigungen noch nicht durchgängig —
  nur die Sidebar blendet Module aus und die jeweilige Server Action lehnt ab.
