# claude.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This is a **static HTML/CSS/JS prototype** for a gym-management admin application ("BEEPLUS"), built as a customization of the **Metronic 4.5.2** admin dashboard template (Bootstrap 3.3.5, jQuery, KeenThemes). There is no backend, no JS framework, no package manager for the app code, and no test suite — pages are hand-authored/edited HTML files linking directly to the theme's compiled CSS/JS assets.

The repo is not a git repository. There is no README.

Top-level layout:
- `gym_software/` — the actual project (everything else at the repo root, e.g. `bootstrap/`, `logo/`, `funkionen_und_Konzept/`, is reference material, downloaded theme zips, or German-language concept documents, not app code).
- `funkionen_und_Konzept/` — German-language concept/spec documents describing intended business logic, available as both `.odt` and `.pdf` (`funktionen.pdf`/`.odt` = feature spec, `idee.pdf`/`.odt` = product pitch); read the `.pdf` versions (the `.odt` files cannot be opened directly). See "Fachkonzept" below for the extracted content.

## Fachkonzept (`funkionen_und_Konzept/`)

This is a German gym-management SaaS concept named **BEEPLUS** (competitor referenced in `idee.pdf`: virtuagym.com). The UI pages in `html/` are prototypes for the modules below; none of this logic is actually implemented (no backend exists in this repo), but it defines what each page is *supposed* to do.

### Modules (per `funktionen.pdf`)
1. **Dashboard** — Übersicht aktive Mitglieder, angemeldete Probetrainings, Kursbesuche, erstellte News, Kalender.
2. **Standorte** (locations) — CRUD inline in the overview grid, add via "Aktionen" button. A location can only be deleted once no members are assigned to it. Reassigning a location cascades to its members. Overview supports filter/search/pagination (this pattern — inline-editable overview grid, filter/search, pagination, "Aktionen" dropdown for add/bulk-delete — repeats across nearly every module).
3. **Mitarbeiter** (employees) — Overview columns: Vorname, Name, Geschlecht, Kurszuordnung, Bewertung durch Kunden, Löschen-Checkbox. Can only delete an employee once no courses are assigned. Detail tabs: persönliche Daten, Foto, **Bankkonto** (payout IBAN + Auszahlungsvereinbarung/Zahlungsziel — triggers automatic transfer), **Überweisungen** (payout history), **Berechtigungen** (permission "Administrator" overrides/includes all others; permission "SEPA Übersicht" both shows the employee the SEPA nav item and reveals the "SEPA-Lastschrift" tab on customer detail pages). Left sidebar: photo, Geburtsdatum, "send email" opens the local mail client.
4. **Kunden** (customers/members) — Overview columns: Vorname, Name, Status, Vertragsart, Standort, Eintrittsdatum, Löschen-Checkbox. Can only delete a customer whose Status is `inaktiv`. Detail tabs:
   - **Persönliche Daten** — if the customer only trains on a **Gutschein** (voucher) basis, a voucher is selected here and bank/contract data become unnecessary (voucher is paid cash); such customers show up under "Gutscheine → Übersicht" instead of as contract members.
   - **Foto**
   - **Bankkonto** (long-term contracts only) — SEPA mandate data; the mandate PDF can be downloaded from this page and must be signed by the customer.
   - **SEPA-Lastschrift(en)** (long-term contracts only) — history of direct-debit collections.
   - **Vertragsdetails** (long-term contracts only) — see cancellation/renewal logic below.
   - Left sidebar: photo, Geburtsdatum, "send email" (opens Outlook).
5. **Kalender** —
   - **Plan**: top nav sets a Standortfilter; "Verfügbare Kurse" can be drag&dropped onto the calendar per location (or all locations); courses can also be added via the "Aktionen" dropdown.
   - Course fill state is color-coded: **grün** = <80% booked, **gelb** = ≤20% spots left, **rot** = fully booked → joining puts you on a Warteliste (waitlist) and you're auto-added when a spot frees up; the *second* person on the waitlist needs *two* spots to free up before being added.
   - Courses the current user is booked into (booked or waitlisted) are marked with a checkmark-circle icon.
   - **Kurse**: course CRUD; selecting a Standort filters the list of available lead trainers; a course can be flagged as "Probetraining möglich" (trial-eligible) with a date, which then makes it selectable when sending trial-training invitations.
6. **Probetrainings** (trial sessions) — Requests come from a form embedded on the public website. A proposed slot is emailed to the prospect with **Zusage/Absage** (accept/decline) links; on decline, staff may still follow up by phone (re-sending another email is discouraged). Accepting auto-adds the prospect to the calendar; the admin gets a notification email on either accept or decline. Processing status has 4 icon states: unprocessed/no reply yet, one proposal accepted (accepted slot highlighted green, other red), both proposals declined (all red, a new proposal can be sent), or not yet processed at all. If an invite is accepted too late, the prospect instead gets an email linking back to the public sign-up form to re-book. A customer can only accept one trial session — a second acceptance attempt is rejected with a message that they're already booked.
7–12. **Gutscheine** (vouchers), **SEPA-Zahlungseinzug**, **E-Mail-Texte**, **News**, **Kunden-Statistiken**, **Website-Statistiken**, **Systeme** — listed as module headings in the spec without further detail.

### Backlog / Zusatzfunktionen (from `funktionen.pdf`)
- Anlegen-/Löschen-Log (audit log)
- Calendar locks 1 hour before a session starts
- Trial-confirmation emails always include an accept/decline link
- Placeholder variables (e.g. Vor-/Nachname) in E-Mail-Texte get substituted at send time (personalized news/emails)
- Public holidays shown in the calendar per Bundesland (no training that day) via an external API
- News can be cross-posted to the website/Facebook
- Automatic birthday emails to members
- A config file drives tunable values (Kündigungsfrist, aut. Verlängerung, etc. — see below)
- Piwik web-analytics integration

### Kündigung/Verlängerung (contract cancellation & auto-renewal logic)

This is the most detailed and most reusable piece of logic in the spec — it governs the "Vertragsdetails" tab for long-term ("Langzeitvertrag") customers. Key fields: `Mitgliedschaft` (Aktiv/Pausiert/Inaktiv), `Beigetreten am` (join date), `Laufzeit (Monate)`, `aut. Verlängerung` (auto-renewal period, set in Config), `Beitrag (€)` + `Abbuchungs Option` (monatlich/wöchentlich), `Kündigungsfrist` (notice period, set in Config, e.g. "3 Monate vor Vertragsablauf"), `Kündigung möglich bis` (last day a cancellation can still be submitted), `Inaktiv von/bis` (pause window), `Kündigung Eingang` (date cancellation was received), `Kündigung wirksam am` (date the cancellation actually takes effect) — plus a "Kündigung PDF" export button.

Rules:
- A newly created long-term member always starts with Mitgliedschaft = **aktiv**.
- `Kündigung möglich bis` = contract end date (`Beigetreten am` + `Laufzeit`) minus `Kündigungsfrist`.
- Submitting a cancellation (filling `Kündigung Eingang`) computes `Kündigung wirksam am`: if received on/before `Kündigung möglich bis`, the contract ends at the original contract end date; if received after that deadline (too late), the contract **auto-renews** by `aut. Verlängerung` and `Kündigung wirksam am` moves out by that period.
- Setting an `Inaktiv von/bis` pause window shifts both `Kündigung möglich bis` and `Kündigung wirksam am` out by the paused duration.

Worked examples from the spec (base contract: Beigetreten 01-01-2016, Laufzeit 12 Monate → contract end 31-12-2016, aut. Verlängerung 3 Monate, Beitrag 65€ monatlich, Kündigungsfrist "3 Monate vor Vertragsablauf" → Kündigung möglich bis 30-09-2016):
1. **Rechtzeitig gekündigt** (`kuendigung_richtig.png`) — Kündigung Eingang 29-09-2016 (before the deadline) → Kündigung wirksam am **31-12-2016** (contract simply ends, no renewal).
2. **Einen Tag zu spät gekündigt** (`kuendigung_falsch.png`) — Kündigung Eingang 01-10-2016 (one day after the 30-09 deadline) → contract auto-renews by the 3-month aut. Verlängerung → Kündigung wirksam am **31-03-2017**.
3. **Vertrag 2 Monate pausiert, keine Kündigung eingereicht** (`verlaengerung.png`) — Inaktiv von 01-03-2016 bis 30-04-2016 (2-month pause) → `Kündigung möglich bis` shifts by 2 months to 30-11-2016, and (with no cancellation submitted) `Kündigung wirksam am` shifts to **28-02-2017** (i.e. the 31-12-2016 contract end pushed out by the 2 paused months).

### Produktidee-Highlights (from `idee.pdf`)
- Kundenübersicht mit Stammdaten, Notizen, Historie gebuchter Dienstleistungen.
- Mitgliedschaften: Laufzeitverträge, Buchungslimitierungen, Beitragseinzug, gebuchte Termine/Kurse je Mitglied, Verwaltung verkaufter 10er-Karten, Vertrag stilllegen (z. B. bei Krankheit), automatische Geburtstags-E-Mails.
- Statistiken: Stoßzeiten, Buchungsverhalten, beliebteste Kurse/Dienstleistungen, grafisch aufbereitet.
- Berichte: automatisch generierte Reports, z. B. täglicher Buchungsreport per E-Mail (auch druckbar).
- Zahlung (SEPA), Rechnungsverwaltung, Mahnungen: Rechnungen/Angebote/Mahnungen aus einem Tool, Verwaltung von Eingangsrechnungen und Lastschriften.
- Genannter Wettbewerber: virtuagym.com.

## Working directory: `gym_software/`

### The pages that matter

The project was edited with the **Pinegrow** visual editor (see `.project`, `_pgbackup/`, `pinegrow.json`). `pinegrow.json` tags each file with a "framework" — files tagged `gym_software` are the custom, project-specific pages; everything else under `html/` and `html_adds/` that isn't tagged that way is unmodified Metronic demo/component-showcase boilerplate (chart demos, form-control demos, UI kit pages, etc.) kept around as a reference/component library, not live app pages.

Custom gym-software pages live in `html/` (the active set) and include:
- `index.html` — dashboard
- `customer_overview.html`, `customer_details.html` — member/customer management
- `employee_overview.html`, `employee_details.html` — staff management
- `course_overview.html` — class/course scheduling
- `calendar_control.html` — calendar
- `coupon_overview.html`, `coupon_in_use.html` — discount/coupon handling
- `trials_overview.html` — trial memberships
- `receipt_overview.html`, `separeceipt_overview.html`, `sepatrials_overview.html` — receipts and SEPA direct-debit related billing (this is a German gym business; SEPA-Lastschrift = SEPA direct debit is the payment method)
- `news.html`, `news_add.html`, `news_details.html`, `news_overview.html` — internal news/announcements
- `locations_overview.html` — multi-location support
- `email_texts.html` — editable email templates
- `page_user_profile_1.html` — user profile

`html_adds/` contains additional/alternate versions of pages plus the full unmodified Metronic demo page set (layouts, form components, UI widgets, chart libraries, etc.) — useful as a component reference when building new pages, but not part of the live app flow.

`_pgbackup/` directories (under `html/` and `html_adds/`) are Pinegrow's automatic timestamped backups of edited files — do not treat these as canonical, and don't bother maintaining them by hand.

### Assets

- `assets/` — compiled/vendored CSS and JS actually referenced by the HTML pages (global plugins, per-page scripts, layout themes). Pages reference these via relative paths like `../assets/global/plugins/...`.
- `sass/` — SCSS sources that compile into `assets/**/css`, organized in parallel: `sass/global`, `sass/apps`, `sass/pages`, `sass/layouts`, `sass/bootstrap`.
- `demo/` — Metronic's demo PHP endpoints (AJAX data sources for datatable/plugin demos). These are template scaffolding, not gym-software backend logic — there is no real backend in this repo.

### Build tooling

Styling is compiled with Gulp (`gulpfile.js`, Node deps in `package.json`, name `metronic`):

```bash
cd gym_software
npm install          # install gulp/sass/minify toolchain
npx gulp sass         # compile all SCSS (sass/**/*.scss) into assets/**/css
npx gulp sass:watch   # recompile on change
npx gulp minify        # minify compiled CSS/JS from assets/** into html/
npx gulp rtlcss         # generate RTL variants of compiled CSS
npx gulp prettify        # reformat all *.html files (4-space indent) in place
```

There is no lint, typecheck, or test command — `npm test` is an unconfigured placeholder. There is no dev server config; open HTML files directly or serve `gym_software/` with any static file server.

### Conventions when editing pages

- Each page is a full, self-contained HTML document (no templating/includes) — header, sidebar nav, and footer markup are duplicated across every page. When changing shared chrome (nav links, header dropdowns, footer), you generally need to update every page in `html/` individually.
- Asset paths are relative (`../assets/...`); keep new pages at the same directory depth (`html/*.html`) so these paths resolve.
- Page `<title>` follows the pattern `BEEPLUS | <Section>`.
- This project predates and does not use `.cursorrules` or Copilot instruction files — none exist in this repo.
