-- app_user (der eingeschraenkte Laufzeit-Benutzer mit NOSUPERUSER NOBYPASSRLS,
-- siehe src/lib/prisma.ts vs. prisma-direct.ts) braucht explizite Grants auf
-- das public-Schema und alle Tabellen. Diese wurden beim urspruenglichen
-- RLS-Setup manuell per psql vergeben, nie als Migration erfasst - und gingen
-- bei einem `prisma migrate reset` verloren, weil GRANTs an die jeweiligen
-- Tabellenobjekte gebunden sind, die der Reset neu anlegt (die ROLE selbst
-- ueberlebt einen Reset, ihre Grants nicht). Ab jetzt Teil der
-- Migrationshistorie, inkl. ALTER DEFAULT PRIVILEGES fuer Tabellen aus
-- kuenftigen Migrationen.
--
-- Setzt voraus, dass die Rolle app_user bereits existiert (einmaliges
-- manuelles Provisioning mit echtem Passwort, siehe .env.example /
-- DATABASE_URL - ein Passwort gehoert nicht in eine versionierte
-- Migrationsdatei).

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;
