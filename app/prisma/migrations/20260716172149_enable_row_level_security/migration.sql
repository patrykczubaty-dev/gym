-- Row-Level-Security: zweite, datenbankseitige Sicherheitsebene fuer die
-- Mandantentrennung (siehe src/lib/scoped-prisma.ts fuer Ebene 1).
--
-- Jede Policy erlaubt eine Zeile nur, wenn ihre "gymId" mit der Postgres-
-- Session-Variable app.current_gym_id uebereinstimmt. Diese Variable wird
-- ausschliesslich in withGymScope() gesetzt (SELECT set_config(...)) - ist
-- sie nicht gesetzt, liefert current_setting(..., true) NULL, und der
-- Vergleich "gymId" = NULL ist in SQL nie wahr. Ohne Gym-Kontext sind also
-- per Default ALLE Zeilen unsichtbar (fail closed), nicht alle sichtbar.
--
-- FORCE ROW LEVEL SECURITY ist noetig, weil die Anwendung mit demselben
-- Datenbank-Benutzer verbindet, der die Tabellen besitzt - ohne FORCE wuerde
-- Postgres RLS fuer den Tabelleneigentuemer sonst automatisch umgehen.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'Location', 'Employee', 'EmployeePayout', 'Customer', 'CustomerBankAccount',
    'SepaDebit', 'ContractPlan', 'ContractDetail', 'VoucherType', 'VoucherAssignment',
    'Course', 'Event', 'CalendarEvent', 'Booking', 'Trial', 'TrialProposedSlot',
    'News', 'NewsAttachment', 'EmailTemplate', 'Settings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("gymId" = current_setting(''app.current_gym_id'', true)) WITH CHECK ("gymId" = current_setting(''app.current_gym_id'', true))',
      tbl
    );
  END LOOP;
END $$;
