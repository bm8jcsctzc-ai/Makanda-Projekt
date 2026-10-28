-- Rechte: Tabellen sind für die App gesperrt (Zeilenschutz ohne Freigaben). Zugriff nur über die Funktionen aus 0002,
-- die als Eigentümer laufen und selbst prüfen, wer angemeldet ist.

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke all on schema intern from public, anon, authenticated;
revoke execute on all functions in schema intern from public, anon, authenticated;

-- Alle Funktionen der Schnittstelle für angemeldete Benutzer
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as signatur
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('grant execute on function %s to authenticated', f.signatur);
  end loop;
end $$;

-- Vor dem Anmelden erlaubt: Ersteinrichtung erkennen und Einladungscode prüfen
grant execute on function public.ersteinrichtung_noetig() to anon;
grant execute on function public.einladung_pruefen(text, text) to anon;

-- Für die Speicher-Regeln (0004): nur diese eine interne Funktion
grant usage on schema intern to authenticated;
grant execute on function intern.speicher_darf(text, text) to authenticated;
