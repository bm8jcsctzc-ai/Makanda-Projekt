-- Schnittstelle der App: Jede Funktion prüft selbst, wer angemeldet ist und was er darf.
-- Die App (Browser) ruft nur diese Funktionen auf. Ergebnisse kommen als JSON (Spaltennamen in snake_case).
-- Fehlermeldungen sind auf Deutsch, weil die App sie direkt anzeigt.

create schema if not exists intern;

-- ---------------------------------------------------------------- Hilfsfunktionen

/** Heutiges Datum in deutscher Zeit */
create or replace function intern.heute() returns date
language sql stable as $$ select (now() at time zone 'Europe/Berlin')::date $$;

/** Profil des angemeldeten Benutzers; Fehler, wenn nicht angemeldet oder Rolle nicht erlaubt */
create or replace function intern.pruefe(erlaubt rolle[] default null) returns profil
language plpgsql stable security definer set search_path = public as $$
declare
  p profil;
begin
  select * into p from profil where id = auth.uid() and aktiv;
  if p.id is null then
    raise exception 'Bitte zuerst anmelden.' using errcode = '28000';
  end if;
  if erlaubt is not null and not (p.rolle = any (erlaubt)) then
    raise exception 'Dafür fehlt die Berechtigung.' using errcode = '42501';
  end if;
  return p;
end $$;

/** Inhaber und Büro planen Einsätze, pflegen Kunden, Vorlagen und Finanzen */
create or replace function intern.planer() returns rolle[]
language sql immutable as $$ select array['inhaber', 'buero']::rolle[] $$;

create or replace function intern.ist_planer(p profil) returns boolean
language sql immutable as $$ select p.rolle in ('inhaber', 'buero') $$;

/** Inhaber und Büro dürfen jeden Einsatz bearbeiten, Monteure nur ihre eigenen */
create or replace function intern.darf_einsatz(p profil, e einsatz) returns boolean
language sql immutable as $$ select intern.ist_planer(p) or e.monteur_id = p.id $$;

/** Darf der angemeldete Benutzer diese Datei im Speicher lesen, schreiben oder löschen? (für die Speicher-Regeln) */
create or replace function intern.speicher_darf(p_name text, p_aktion text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  p profil;
  d datei;
  bereich text := split_part(p_name, '/', 1);
begin
  select * into p from profil where id = auth.uid() and aktiv;
  if p.id is null or bereich not in ('finanzen', 'technik') then
    return false;
  end if;
  if bereich = 'finanzen' then
    return intern.ist_planer(p);
  end if;
  if p_aktion in ('lesen', 'schreiben') then
    return true;
  end if;
  -- Löschen von Fotos: Büro/Inhaber, wer es hochgeladen hat, oder Reste ohne Eintrag in der App
  select * into d from datei where speicher_pfad = p_name;
  return intern.ist_planer(p) or d.id is null or d.hochgeladen_von = p.id;
end $$;

/** Wartungsliste: Anlagen mit Kunde, geplantem Wartungstermin und Erinnerungen (auch für die E-Mail-Aufgaben) */
create or replace function intern.wartungsdaten(p_heute date) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'a', to_jsonb(a),
      'k', to_jsonb(k),
      'geplant_am', (select min(e.datum) from einsatz e
                     where e.anlage_id = a.id and e.art = 'wartung' and e.status <> 'abgeschlossen' and e.datum >= p_heute),
      'erinnert_am', (select w.gesendet_am from wartung_erinnerung w
                      where w.anlage_id = a.id and w.faellig_am = a.naechste_wartung_am),
      'erinnert_fuer', coalesce((select jsonb_agg(w.faellig_am) from wartung_erinnerung w where w.anlage_id = a.id), '[]'::jsonb)
    ) order by a.naechste_wartung_am nulls last, k.name), '[]'::jsonb)
  from anlage a join kunde k on k.id = a.kunde_id
$$;

/** Legt eine E-Mail in die Warteschlange; verschickt wird sie vom Automatik-Dienst */
create or replace function intern.mail_einreihen(p_an text, p_betreff text, p_text text) returns void
language sql security definer set search_path = public as $$
  insert into mail_protokoll (an, betreff, text, status) values (p_an, p_betreff, p_text, 'wartend')
$$;

create or replace function intern.datum_de(d date) returns text
language sql immutable as $$ select to_char(d, 'DD.MM.YYYY') $$;

-- ---------------------------------------------------------------- Anmeldung und Benutzer

/** Neuer Login in Supabase: erster Benutzer wird Inhaber, weitere brauchen eine Einladung (E-Mail + Code) */
create or replace function intern.neuer_login() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  e einladung;
begin
  perform pg_advisory_xact_lock(4711);
  if not exists (select 1 from profil) then
    insert into profil (id, email, name, rolle)
    values (new.id, new.email, coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), 'inhaber');
    return new;
  end if;
  select * into e from einladung
  where lower(email) = lower(new.email)
    and code = upper(trim(coalesce(new.raw_user_meta_data ->> 'einladungscode', '')));
  if found then
    insert into profil (id, email, name, rolle) values (new.id, new.email, e.name, e.rolle);
    delete from einladung where id = e.id;
  end if;
  return new;
end $$;

drop trigger if exists neuer_login on auth.users;
create trigger neuer_login after insert on auth.users for each row execute function intern.neuer_login();

/** Gibt es noch gar keinen Benutzer? Dann zeigt die App die Ersteinrichtung. */
create or replace function public.ersteinrichtung_noetig() returns boolean
language sql stable security definer set search_path = public as $$ select not exists (select 1 from profil) $$;

/** Prüft vor der Registrierung, ob E-Mail und Einladungscode zusammenpassen */
create or replace function public.einladung_pruefen(p_email text, p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from einladung where lower(email) = lower(trim(p_email)) and code = upper(trim(p_code)))
$$;

/** Eigenes Profil; null, wenn nicht angemeldet, deaktiviert oder ohne Freischaltung */
create or replace function public.ich() returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(p) from profil p where p.id = auth.uid() and p.aktiv
$$;

/** Aktive Mitarbeiter (für Auswahllisten und den Urlaubskalender) */
create or replace function public.team() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform intern.pruefe();
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'rolle', rolle, 'im_team', im_team,
                                                       'urlaubstage_pro_jahr', urlaubstage_pro_jahr) order by name)
                   from profil where aktiv), '[]'::jsonb);
end $$;

create or replace function public.benutzer_liste() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform intern.pruefe(array['inhaber']::rolle[]);
  return jsonb_build_object(
    'benutzer', coalesce((select jsonb_agg(to_jsonb(p) order by p.name) from profil p), '[]'::jsonb),
    'einladungen', coalesce((select jsonb_agg(to_jsonb(e) order by e.erstellt_am desc) from einladung e), '[]'::jsonb));
end $$;

create or replace function public.benutzer_aendern(p_id uuid, p_rolle rolle, p_aktiv boolean, p_im_team boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe(array['inhaber']::rolle[]);
begin
  if p_id = ich.id and not p_aktiv then
    raise exception 'Du kannst dich nicht selbst deaktivieren.';
  end if;
  if (p_rolle <> 'inhaber' or not p_aktiv)
     and not exists (select 1 from profil where rolle = 'inhaber' and aktiv and id <> p_id) then
    raise exception 'Es muss mindestens ein aktiver Inhaber bleiben.';
  end if;
  update profil set rolle = p_rolle, aktiv = p_aktiv, im_team = p_im_team where id = p_id;
end $$;

/** Neue Einladung; gibt den Code zurück, den der Mitarbeiter bei der Registrierung eingibt */
create or replace function public.einladung_erstellen(p_name text, p_email text, p_rolle rolle) returns text
language plpgsql security definer set search_path = public as $$
declare
  neuer_code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
begin
  perform intern.pruefe(array['inhaber']::rolle[]);
  if coalesce(trim(p_name), '') = '' or p_email !~ '^\S+@\S+\.\S+$' then
    raise exception 'Bitte Name und eine gültige E-Mail-Adresse angeben.';
  end if;
  if exists (select 1 from profil where lower(email) = lower(trim(p_email))) then
    raise exception 'Für diese E-Mail-Adresse gibt es schon einen Zugang.';
  end if;
  insert into einladung (email, name, rolle, code) values (lower(trim(p_email)), trim(p_name), p_rolle, neuer_code)
  on conflict (email) do update set name = excluded.name, rolle = excluded.rolle, code = excluded.code, erstellt_am = now();
  return neuer_code;
end $$;

create or replace function public.einladung_loeschen(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform intern.pruefe(array['inhaber']::rolle[]);
  delete from einladung where id = p_id;
end $$;

-- ---------------------------------------------------------------- Dateien

/** Trägt eine hochgeladene Datei ein. Pfad beginnt mit "finanzen/" oder "technik/". */
create or replace function public.datei_registrieren(p_pfad text, p_name text, p_typ text, p_groesse integer) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
  bereich text := split_part(p_pfad, '/', 1);
  neu uuid;
begin
  if bereich not in ('finanzen', 'technik') then
    raise exception 'Ungültiger Speicherort.';
  end if;
  if bereich = 'finanzen' and not intern.ist_planer(ich) then
    raise exception 'Dafür fehlt die Berechtigung.' using errcode = '42501';
  end if;
  insert into datei (original_name, mime_type, groesse, speicher_pfad, bereich, hochgeladen_von)
  values (p_name, p_typ, p_groesse, p_pfad, bereich, ich.id)
  returning id into neu;
  return neu;
end $$;

-- ---------------------------------------------------------------- Finanzen

create or replace function public.finanz_daten() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  ich profil := intern.pruefe(intern.planer());
begin
  return jsonb_build_object(
    'rechnungen', coalesce((
      select jsonb_agg(to_jsonb(r) || jsonb_build_object('datei_pfad', d.speicher_pfad, 'datei_name', d.original_name)
                       order by r.rechnungsdatum desc, r.erstellt_am desc)
      from rechnung r left join datei d on d.id = r.datei_id), '[]'::jsonb),
    'fixkosten', coalesce((select jsonb_agg(to_jsonb(f) order by f.kategorie, f.bezeichnung) from fixkosten f), '[]'::jsonb),
    'personal', case when ich.rolle = 'inhaber'
      then coalesce((select jsonb_agg(to_jsonb(p) order by p.mitarbeiter, p.gueltig_ab desc) from personalkosten p), '[]'::jsonb)
    end);
end $$;

create or replace function public.rechnung_speichern(p_id uuid, p_daten jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe(intern.planer());
  r rechnung := jsonb_populate_record(null::rechnung, p_daten);
  alt rechnung;
  alter_pfad text;
begin
  if coalesce(trim(r.lieferant), '') = '' or r.rechnungsdatum is null or r.brutto_cent is null or r.brutto_cent <= 0 then
    raise exception 'Bitte Lieferant, Rechnungsdatum und Betrag angeben.';
  end if;
  if p_id is null then
    insert into rechnung (lieferant, rechnungsnummer, rechnungsdatum, faellig_am, brutto_cent, mwst_satz, kategorie,
                          bezahlt_am, notiz, datei_id, erstellt_von)
    values (r.lieferant, r.rechnungsnummer, r.rechnungsdatum, r.faellig_am, r.brutto_cent, coalesce(r.mwst_satz, 19),
            r.kategorie, r.bezahlt_am, r.notiz, r.datei_id, ich.id)
    returning id into p_id;
  else
    select * into alt from rechnung where id = p_id;
    if alt.id is null then raise exception 'Diese Rechnung gibt es nicht mehr.'; end if;
    update rechnung set lieferant = r.lieferant, rechnungsnummer = r.rechnungsnummer, rechnungsdatum = r.rechnungsdatum,
      faellig_am = r.faellig_am, brutto_cent = r.brutto_cent, mwst_satz = coalesce(r.mwst_satz, 19), kategorie = r.kategorie,
      bezahlt_am = r.bezahlt_am, notiz = r.notiz, datei_id = coalesce(r.datei_id, alt.datei_id)
    where id = p_id;
    -- Neue Datei ersetzt die alte
    if r.datei_id is not null and alt.datei_id is not null and r.datei_id <> alt.datei_id then
      delete from datei where id = alt.datei_id returning speicher_pfad into alter_pfad;
    end if;
  end if;
  return jsonb_build_object('id', p_id, 'alter_pfad', alter_pfad);
end $$;

/** Löscht die Rechnung und gibt den Pfad der Datei zurück, damit die App sie aus dem Speicher entfernt */
create or replace function public.rechnung_loeschen(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  r rechnung;
  pfad text;
begin
  perform intern.pruefe(intern.planer());
  delete from rechnung where id = p_id returning * into r;
  if r.datei_id is not null then
    delete from datei where id = r.datei_id returning speicher_pfad into pfad;
  end if;
  return pfad;
end $$;

create or replace function public.rechnung_bezahlt(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform intern.pruefe(intern.planer());
  update rechnung set bezahlt_am = intern.heute() where id = p_id;
end $$;

create or replace function public.fixkosten_speichern(p_id uuid, p_daten jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  f fixkosten := jsonb_populate_record(null::fixkosten, p_daten);
begin
  perform intern.pruefe(intern.planer());
  if p_id is null then
    insert into fixkosten (bezeichnung, kategorie, betrag_cent, intervall, beginn, ende, notiz)
    values (f.bezeichnung, f.kategorie, f.betrag_cent, f.intervall, f.beginn, f.ende, f.notiz) returning id into p_id;
  else
    update fixkosten set bezeichnung = f.bezeichnung, kategorie = f.kategorie, betrag_cent = f.betrag_cent,
      intervall = f.intervall, beginn = f.beginn, ende = f.ende, notiz = f.notiz where id = p_id;
  end if;
  return p_id;
end $$;

create or replace function public.fixkosten_loeschen(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform intern.pruefe(intern.planer());
  delete from fixkosten where id = p_id;
end $$;

create or replace function public.personalkosten_speichern(p_id uuid, p_daten jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  k personalkosten := jsonb_populate_record(null::personalkosten, p_daten);
begin
  perform intern.pruefe(array['inhaber']::rolle[]);
  if p_id is null then
    insert into personalkosten (mitarbeiter, funktion, brutto_cent, arbeitgeberanteil_cent, gueltig_ab, gueltig_bis, notiz)
    values (k.mitarbeiter, k.funktion, k.brutto_cent, coalesce(k.arbeitgeberanteil_cent, 0), k.gueltig_ab, k.gueltig_bis, k.notiz)
    returning id into p_id;
  else
    update personalkosten set mitarbeiter = k.mitarbeiter, funktion = k.funktion, brutto_cent = k.brutto_cent,
      arbeitgeberanteil_cent = coalesce(k.arbeitgeberanteil_cent, 0), gueltig_ab = k.gueltig_ab, gueltig_bis = k.gueltig_bis,
      notiz = k.notiz where id = p_id;
  end if;
  return p_id;
end $$;

create or replace function public.personalkosten_loeschen(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform intern.pruefe(array['inhaber']::rolle[]);
  delete from personalkosten where id = p_id;
end $$;

-- ---------------------------------------------------------------- Kunden und Anlagen

create or replace function public.kunden(p_suche text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  muster text := '%' || replace(replace(replace(coalesce(trim(p_suche), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
  perform intern.pruefe();
  return coalesce((
    select jsonb_agg(to_jsonb(k) || jsonb_build_object(
             'anlagen', (select count(*) from anlage a where a.kunde_id = k.id),
             'naechste_wartung', (select min(a.naechste_wartung_am) from anlage a where a.kunde_id = k.id))
           order by k.name)
    from kunde k
    where coalesce(trim(p_suche), '') = ''
       or k.name ilike muster or k.ort ilike muster or k.strasse ilike muster or k.taifun_kundennr ilike muster), '[]'::jsonb);
end $$;

create or replace function public.kunde(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  k kunde;
begin
  perform intern.pruefe();
  select * into k from kunde where id = p_id;
  if k.id is null then return null; end if;
  return jsonb_build_object(
    'kunde', to_jsonb(k),
    'anlagen', coalesce((select jsonb_agg(to_jsonb(a) order by a.erstellt_am) from anlage a where a.kunde_id = p_id), '[]'::jsonb),
    'einsaetze', coalesce((
      select jsonb_agg(jsonb_build_object('e', to_jsonb(e), 'monteur', p.name) order by e.datum desc)
      from (select * from einsatz where kunde_id = p_id order by datum desc limit 30) e
      left join profil p on p.id = e.monteur_id), '[]'::jsonb));
end $$;

create or replace function public.kunde_speichern(p_id uuid, p_daten jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  k kunde := jsonb_populate_record(null::kunde, p_daten);
begin
  perform intern.pruefe(intern.planer());
  if coalesce(trim(k.name), '') = '' then raise exception 'Bitte einen Namen angeben.'; end if;
  if p_id is null then
    insert into kunde (name, ansprechpartner, strasse, plz, ort, telefon, email, hinweise, erinnerungen, taifun_kundennr)
    values (k.name, k.ansprechpartner, k.strasse, k.plz, k.ort, k.telefon, k.email, k.hinweise, coalesce(k.erinnerungen, true),
            k.taifun_kundennr)
    returning id into p_id;
  else
    update kunde set name = k.name, ansprechpartner = k.ansprechpartner, strasse = k.strasse, plz = k.plz, ort = k.ort,
      telefon = k.telefon, email = k.email, hinweise = k.hinweise, erinnerungen = coalesce(k.erinnerungen, true),
      taifun_kundennr = k.taifun_kundennr
    where id = p_id;
  end if;
  return p_id;
end $$;

/** Löscht den Kunden mit allem, was dazugehört; gibt die Pfade der Fotos zurück */
create or replace function public.kunde_loeschen(p_id uuid) returns text[]
language plpgsql security definer set search_path = public as $$
declare
  pfade text[];
begin
  perform intern.pruefe(intern.planer());
  with weg as (
    delete from datei where id in (select datei_id from foto where kunde_id = p_id) returning speicher_pfad
  ) select coalesce(array_agg(speicher_pfad), '{}') into pfade from weg;
  delete from kunde where id = p_id;
  return pfade;
end $$;

create or replace function public.anlage(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  a anlage;
begin
  perform intern.pruefe();
  select * into a from anlage where id = p_id;
  if a.id is null then return null; end if;
  return jsonb_build_object(
    'anlage', to_jsonb(a),
    'kunde', (select to_jsonb(k) from kunde k where k.id = a.kunde_id),
    'fotos', coalesce((
      select jsonb_agg(to_jsonb(f) || jsonb_build_object('pfad', d.speicher_pfad, 'von', p.name) order by f.aufgenommen_am desc)
      from foto f join datei d on d.id = f.datei_id left join profil p on p.id = f.aufgenommen_von
      where f.anlage_id = p_id), '[]'::jsonb),
    'checklisten', coalesce((
      select jsonb_agg(to_jsonb(c) || jsonb_build_object('datum', e.datum, 'von', p.name) order by e.datum desc)
      from checkliste_ergebnis c join einsatz e on e.id = c.einsatz_id left join profil p on p.id = c.ausgefuellt_von
      where c.anlage_id = p_id), '[]'::jsonb),
    'einsaetze', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.datum desc)
      from (select * from einsatz where anlage_id = p_id order by datum desc limit 20) e), '[]'::jsonb));
end $$;

/** Anlagen dürfen alle anlegen und ändern – Monteure erfassen Typenschilder oft erst vor Ort */
create or replace function public.anlage_speichern(p_id uuid, p_kunde_id uuid, p_daten jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a anlage := jsonb_populate_record(null::anlage, p_daten);
begin
  perform intern.pruefe();
  if a.typ is null then raise exception 'Bitte die Art der Anlage wählen.'; end if;
  if p_id is null then
    if not exists (select 1 from kunde where id = p_kunde_id) then raise exception 'Kunde nicht gefunden.'; end if;
    insert into anlage (kunde_id, typ, bezeichnung, hersteller, modell, seriennummer, baujahr, leistung_kw, kaeltemittel,
                        kaeltemittel_kg, aufstellort, wartungsintervall_monate, letzte_wartung_am, naechste_wartung_am, notiz)
    values (p_kunde_id, a.typ, a.bezeichnung, a.hersteller, a.modell, a.seriennummer, a.baujahr, a.leistung_kw, a.kaeltemittel,
            a.kaeltemittel_kg, a.aufstellort, coalesce(a.wartungsintervall_monate, 12), a.letzte_wartung_am,
            a.naechste_wartung_am, a.notiz)
    returning id into p_id;
  else
    update anlage set typ = a.typ, bezeichnung = a.bezeichnung, hersteller = a.hersteller, modell = a.modell,
      seriennummer = a.seriennummer, baujahr = a.baujahr, leistung_kw = a.leistung_kw, kaeltemittel = a.kaeltemittel,
      kaeltemittel_kg = a.kaeltemittel_kg, aufstellort = a.aufstellort,
      wartungsintervall_monate = coalesce(a.wartungsintervall_monate, 12), letzte_wartung_am = a.letzte_wartung_am,
      naechste_wartung_am = a.naechste_wartung_am, notiz = a.notiz
    where id = p_id;
  end if;
  return p_id;
end $$;

create or replace function public.anlage_loeschen(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  kunde_id uuid;
  pfade text[];
begin
  perform intern.pruefe(intern.planer());
  select a.kunde_id into kunde_id from anlage a where a.id = p_id;
  with weg as (
    delete from datei where id in (select datei_id from foto where anlage_id = p_id) returning speicher_pfad
  ) select coalesce(array_agg(speicher_pfad), '{}') into pfade from weg;
  delete from anlage where id = p_id;
  return jsonb_build_object('kunde_id', kunde_id, 'pfade', to_jsonb(pfade));
end $$;

-- ---------------------------------------------------------------- Einsätze

/** Einsätze mit Kunde, Anlage und Monteur, sortiert nach Datum und Uhrzeit */
create or replace function public.einsaetze(
  p_von date default null, p_bis date default null, p_monteur uuid default null,
  p_nur_offen boolean default false, p_ohne_monteur boolean default false
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform intern.pruefe();
  return coalesce((
    select jsonb_agg(jsonb_build_object('e', to_jsonb(e), 'k', to_jsonb(k), 'a', to_jsonb(a), 'monteur', p.name)
                     order by e.datum, e.uhrzeit nulls first)
    from einsatz e
    join kunde k on k.id = e.kunde_id
    left join anlage a on a.id = e.anlage_id
    left join profil p on p.id = e.monteur_id
    where (p_von is null or e.datum >= p_von)
      and (p_bis is null or e.datum <= p_bis)
      and (p_monteur is null or e.monteur_id = p_monteur)
      and (not p_nur_offen or e.status <> 'abgeschlossen')
      and (not p_ohne_monteur or e.monteur_id is null)), '[]'::jsonb);
end $$;

create or replace function public.einsatz(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
  e einsatz;
begin
  select * into e from einsatz where id = p_id;
  if e.id is null then return null; end if;
  return jsonb_build_object(
    'e', to_jsonb(e),
    'k', (select to_jsonb(k) from kunde k where k.id = e.kunde_id),
    'a', (select to_jsonb(a) from anlage a where a.id = e.anlage_id),
    'monteur', (select name from profil where id = e.monteur_id),
    'darf', intern.darf_einsatz(ich, e),
    'planer', intern.ist_planer(ich),
    'checklisten', coalesce((select jsonb_agg(to_jsonb(c) order by c.geaendert_am) from checkliste_ergebnis c
                             where c.einsatz_id = p_id), '[]'::jsonb),
    'vorlagen', coalesce((select jsonb_agg(to_jsonb(v) order by v.name) from checkliste_vorlage v where v.aktiv), '[]'::jsonb),
    'fotos', coalesce((
      select jsonb_agg(to_jsonb(f) || jsonb_build_object('pfad', d.speicher_pfad, 'von', p.name) order by f.aufgenommen_am desc)
      from foto f join datei d on d.id = f.datei_id left join profil p on p.id = f.aufgenommen_von
      where f.einsatz_id = p_id), '[]'::jsonb),
    'abwesend', (select jsonb_build_object('status', w.status) from abwesenheit w
                 where w.benutzer_id = e.monteur_id and w.status <> 'abgelehnt' and e.datum between w.von and w.bis limit 1));
end $$;

/** Auswahllisten für das Einsatz-Formular */
create or replace function public.einsatz_auswahl() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform intern.pruefe(intern.planer());
  return jsonb_build_object(
    'kunden', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'ort', ort) order by name) from kunde), '[]'::jsonb),
    'anlagen', coalesce((select jsonb_agg(to_jsonb(a) order by a.erstellt_am) from anlage a), '[]'::jsonb),
    'mitarbeiter', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name) from profil where aktiv), '[]'::jsonb),
    'abwesenheiten', coalesce((
      select jsonb_agg(jsonb_build_object('benutzer_id', benutzer_id, 'von', von, 'bis', bis, 'status', status))
      from abwesenheit where status <> 'abgelehnt' and bis >= intern.heute() - 60), '[]'::jsonb));
end $$;

create or replace function public.einsatz_speichern(p_id uuid, p_daten jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  e einsatz := jsonb_populate_record(null::einsatz, p_daten);
begin
  perform intern.pruefe(intern.planer());
  if e.kunde_id is null or e.datum is null or e.art is null then
    raise exception 'Bitte Kunde, Datum und Art angeben.';
  end if;
  if e.anlage_id is not null and not exists (select 1 from anlage where id = e.anlage_id and kunde_id = e.kunde_id) then
    raise exception 'Die Anlage gehört nicht zu diesem Kunden.';
  end if;
  if e.monteur_id is not null and not exists (select 1 from profil where id = e.monteur_id and aktiv) then
    raise exception 'Dieser Mitarbeiter ist nicht aktiv.';
  end if;
  if p_id is null then
    insert into einsatz (kunde_id, anlage_id, monteur_id, datum, uhrzeit, art, beschreibung)
    values (e.kunde_id, e.anlage_id, e.monteur_id, e.datum, e.uhrzeit, e.art, e.beschreibung) returning id into p_id;
  else
    update einsatz set kunde_id = e.kunde_id, anlage_id = e.anlage_id, monteur_id = e.monteur_id, datum = e.datum,
      uhrzeit = e.uhrzeit, art = e.art, beschreibung = e.beschreibung where id = p_id;
  end if;
  return p_id;
end $$;

/** Löscht den Einsatz; Fotos zur Anlage bleiben, reine Einsatz-Fotos werden mit gelöscht (Pfade zurück) */
create or replace function public.einsatz_loeschen(p_id uuid) returns text[]
language plpgsql security definer set search_path = public as $$
declare
  pfade text[];
begin
  perform intern.pruefe(intern.planer());
  with weg as (
    delete from datei where id in (select datei_id from foto where einsatz_id = p_id and anlage_id is null)
    returning speicher_pfad
  ) select coalesce(array_agg(speicher_pfad), '{}') into pfade from weg;
  delete from einsatz where id = p_id;
  return pfade;
end $$;

create or replace function public.einsatz_abschliessen(p_id uuid, p_bemerkung text) returns void
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
  e einsatz;
  offen text;
begin
  select * into e from einsatz where id = p_id;
  if e.id is null then raise exception 'Einsatz nicht gefunden.'; end if;
  if not intern.darf_einsatz(ich, e) then raise exception 'Das ist nicht dein Einsatz.'; end if;
  select string_agg(name, ', ') into offen from checkliste_ergebnis where einsatz_id = p_id and not abgeschlossen;
  if offen is not null then
    raise exception 'Bitte zuerst die Checkliste abschließen: %', offen;
  end if;
  update einsatz set status = 'abgeschlossen', abgeschlossen_am = now(), abschluss_bemerkung = nullif(trim(p_bemerkung), '')
  where id = p_id;
end $$;

create or replace function public.einsatz_wieder_oeffnen(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform intern.pruefe(intern.planer());
  update einsatz set status = 'in_arbeit', abgeschlossen_am = null where id = p_id;
end $$;

-- ---------------------------------------------------------------- Checklisten

create or replace function public.checkliste_starten(p_einsatz_id uuid, p_vorlage_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
  e einsatz;
  v checkliste_vorlage;
  neu uuid;
begin
  select * into e from einsatz where id = p_einsatz_id;
  if e.id is null then raise exception 'Einsatz nicht gefunden.'; end if;
  if not intern.darf_einsatz(ich, e) then raise exception 'Das ist nicht dein Einsatz.'; end if;
  if e.status = 'abgeschlossen' then raise exception 'Der Einsatz ist schon abgeschlossen.'; end if;
  select * into v from checkliste_vorlage where id = p_vorlage_id;
  if v.id is null then raise exception 'Bitte eine Checkliste wählen.'; end if;
  insert into checkliste_ergebnis (einsatz_id, anlage_id, vorlage_id, name, ist_wartung, punkte, ausgefuellt_von)
  values (e.id, e.anlage_id, v.id, v.name, v.ist_wartung, v.punkte, ich.id) returning id into neu;
  update einsatz set status = 'in_arbeit' where id = e.id and status = 'geplant';
  return neu;
end $$;

create or replace function public.checkliste(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
  c checkliste_ergebnis;
  e einsatz;
begin
  select * into c from checkliste_ergebnis where id = p_id;
  if c.id is null then return null; end if;
  select * into e from einsatz where id = c.einsatz_id;
  return jsonb_build_object(
    'c', to_jsonb(c),
    'e', to_jsonb(e),
    'k', (select to_jsonb(k) from kunde k where k.id = e.kunde_id),
    'a', (select to_jsonb(a) from anlage a where a.id = c.anlage_id),
    'von', (select name from profil where id = c.ausgefuellt_von),
    'bearbeitbar', not c.abgeschlossen and intern.darf_einsatz(ich, e),
    'planer', intern.ist_planer(ich),
    'loeschbar', intern.ist_planer(ich) or (not c.abgeschlossen and intern.darf_einsatz(ich, e)));
end $$;

/** Speichert Antworten. Mit p_abschliessen werden Pflichtfelder geprüft und bei Wartungen das nächste Wartungsdatum gesetzt. */
create or replace function public.checkliste_speichern(p_id uuid, p_antworten jsonb, p_abschliessen boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
  c checkliste_ergebnis;
  e einsatz;
  fehlend text;
  keine_zahl text;
begin
  select * into c from checkliste_ergebnis where id = p_id;
  if c.id is null then raise exception 'Checkliste nicht gefunden.'; end if;
  select * into e from einsatz where id = c.einsatz_id;
  if not intern.darf_einsatz(ich, e) then raise exception 'Das ist nicht dein Einsatz.'; end if;
  if c.abgeschlossen then raise exception 'Diese Checkliste ist schon abgeschlossen.'; end if;

  -- Nur Antworten zu bekannten Punkten übernehmen
  select coalesce(jsonb_object_agg(pkt ->> 'id', p_antworten -> (pkt ->> 'id')), '{}'::jsonb) into p_antworten
  from jsonb_array_elements(c.punkte) pkt
  where p_antworten ? (pkt ->> 'id');

  if p_abschliessen then
    select string_agg(pkt ->> 'text', ' · ') into fehlend
    from jsonb_array_elements(c.punkte) pkt
    where (pkt ->> 'pflicht')::boolean and coalesce(trim(p_antworten -> (pkt ->> 'id') ->> 'wert'), '') = '';
    if fehlend is not null then raise exception 'Noch nicht ausgefüllt: %', fehlend; end if;
    select string_agg(pkt ->> 'text', ' · ') into keine_zahl
    from jsonb_array_elements(c.punkte) pkt
    where pkt ->> 'typ' = 'messwert'
      and coalesce(trim(p_antworten -> (pkt ->> 'id') ->> 'wert'), '') <> ''
      and replace(trim(p_antworten -> (pkt ->> 'id') ->> 'wert'), ',', '.') !~ '^-?\d+(\.\d+)?$';
    if keine_zahl is not null then raise exception 'Keine gültige Zahl: %', keine_zahl; end if;
  end if;

  update checkliste_ergebnis
  set antworten = p_antworten, geaendert_am = now(),
      abgeschlossen = p_abschliessen, abgeschlossen_am = case when p_abschliessen then now() end
  where id = p_id;

  if p_abschliessen and c.ist_wartung and c.anlage_id is not null then
    update anlage set letzte_wartung_am = e.datum,
      naechste_wartung_am = (e.datum + make_interval(months => wartungsintervall_monate))::date
    where id = c.anlage_id;
  end if;
end $$;

create or replace function public.checkliste_wieder_oeffnen(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform intern.pruefe(intern.planer());
  update checkliste_ergebnis set abgeschlossen = false, abgeschlossen_am = null where id = p_id;
end $$;

/** Abgeschlossene Checklisten sind Nachweise – die darf nur das Büro löschen */
create or replace function public.checkliste_loeschen(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
  c checkliste_ergebnis;
  e einsatz;
begin
  select * into c from checkliste_ergebnis where id = p_id;
  if c.id is null then return null; end if;
  select * into e from einsatz where id = c.einsatz_id;
  if not (intern.ist_planer(ich) or (not c.abgeschlossen and intern.darf_einsatz(ich, e))) then
    raise exception 'Dafür fehlt die Berechtigung.';
  end if;
  delete from checkliste_ergebnis where id = p_id;
  return e.id;
end $$;

create or replace function public.vorlagen() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform intern.pruefe();
  return coalesce((select jsonb_agg(to_jsonb(v) order by v.name) from checkliste_vorlage v), '[]'::jsonb);
end $$;

create or replace function public.vorlage_speichern(p_id uuid, p_daten jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v checkliste_vorlage := jsonb_populate_record(null::checkliste_vorlage, p_daten);
  alt checkliste_vorlage;
begin
  perform intern.pruefe(intern.planer());
  if coalesce(trim(v.name), '') = '' then raise exception 'Bitte einen Namen angeben.'; end if;
  if jsonb_array_length(coalesce(v.punkte, '[]')) = 0 then
    raise exception 'Die Checkliste braucht mindestens einen Prüfpunkt.';
  end if;
  if p_id is null then
    insert into checkliste_vorlage (name, anlagentyp, ist_wartung, aktiv, punkte)
    values (trim(v.name), v.anlagentyp, coalesce(v.ist_wartung, false), coalesce(v.aktiv, true), v.punkte) returning id into p_id;
  else
    select * into alt from checkliste_vorlage where id = p_id;
    update checkliste_vorlage set name = trim(v.name), anlagentyp = v.anlagentyp, ist_wartung = coalesce(v.ist_wartung, false),
      aktiv = coalesce(v.aktiv, true), punkte = v.punkte,
      version = alt.version + case when alt.punkte is distinct from v.punkte then 1 else 0 end
    where id = p_id;
  end if;
  return p_id;
end $$;

create or replace function public.vorlage_loeschen(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform intern.pruefe(intern.planer());
  delete from checkliste_vorlage where id = p_id;
end $$;

-- ---------------------------------------------------------------- Fotos

create or replace function public.foto_speichern(
  p_datei_id uuid, p_kunde_id uuid, p_einsatz_id uuid, p_anlage_id uuid, p_kategorie fotokategorie, p_beschreibung text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
  e einsatz;
  neu uuid;
begin
  if not exists (select 1 from datei where id = p_datei_id and bereich = 'technik' and hochgeladen_von = ich.id) then
    raise exception 'Foto nicht gefunden.';
  end if;
  if not exists (select 1 from kunde where id = p_kunde_id) then raise exception 'Kunde fehlt.'; end if;
  if p_einsatz_id is not null then
    select * into e from einsatz where id = p_einsatz_id;
    if e.id is null or e.kunde_id <> p_kunde_id then raise exception 'Einsatz nicht gefunden.'; end if;
    if not intern.darf_einsatz(ich, e) then raise exception 'Das ist nicht dein Einsatz.'; end if;
    update einsatz set status = 'in_arbeit' where id = e.id and status = 'geplant';
  end if;
  if p_anlage_id is not null and not exists (select 1 from anlage where id = p_anlage_id and kunde_id = p_kunde_id) then
    raise exception 'Anlage nicht gefunden.';
  end if;
  insert into foto (datei_id, kunde_id, einsatz_id, anlage_id, kategorie, beschreibung, aufgenommen_von)
  values (p_datei_id, p_kunde_id, p_einsatz_id, p_anlage_id, p_kategorie, nullif(trim(p_beschreibung), ''), ich.id)
  returning id into neu;
  return neu;
end $$;

/** Löscht ein Foto (Büro oder wer es aufgenommen hat) und gibt den Speicherpfad zurück */
create or replace function public.foto_loeschen(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
  f foto;
  pfad text;
begin
  select * into f from foto where id = p_id;
  if f.id is null then return null; end if;
  if not (intern.ist_planer(ich) or f.aufgenommen_von = ich.id) then raise exception 'Dafür fehlt die Berechtigung.'; end if;
  delete from datei where id = f.datei_id returning speicher_pfad into pfad;
  return pfad;
end $$;

-- ---------------------------------------------------------------- Wartungsplan, Einstellungen, E-Mails

create or replace function public.wartungen() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform intern.pruefe(intern.planer());
  return intern.wartungsdaten(intern.heute());
end $$;

create or replace function public.einstellungen() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform intern.pruefe();
  return (select to_jsonb(e) from einstellungen e where id = 1);
end $$;

create or replace function public.einstellungen_speichern(p_daten jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  n einstellungen := jsonb_populate_record(null::einstellungen, p_daten);
begin
  perform intern.pruefe(intern.planer());
  update einstellungen set firmenname = coalesce(n.firmenname, ''), firma_telefon = n.firma_telefon, buero_email = n.buero_email,
    erinnerungen_aktiv = coalesce(n.erinnerungen_aktiv, true), erinnerung_vorlauf_monate = coalesce(n.erinnerung_vorlauf_monate, 3),
    erinnerung_betreff = n.erinnerung_betreff, erinnerung_text = n.erinnerung_text,
    wochenbericht_aktiv = coalesce(n.wochenbericht_aktiv, true), haeufung_grenze = n.haeufung_grenze, bundesland = n.bundesland
  where id = 1;
end $$;

create or replace function public.mail_protokoll() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform intern.pruefe(intern.planer());
  return coalesce((select jsonb_agg(to_jsonb(m) order by m.erstellt_am desc)
                   from (select * from mail_protokoll order by erstellt_am desc limit 200) m), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------- Urlaub und Abwesenheiten

/** Abwesenheiten im Zeitraum (ohne abgelehnte). Monteure sehen bei Kollegen nur „abwesend“, nicht den Grund. */
create or replace function public.abwesenheiten(p_von date, p_bis date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', w.id, 'benutzer_id', w.benutzer_id, 'name', p.name, 'von', w.von, 'bis', w.bis,
        'halbtags', w.halbtags, 'status', w.status,
        'art', case when intern.ist_planer(ich) or w.benutzer_id = ich.id then w.art::text end)
      order by w.von)
    from abwesenheit w join profil p on p.id = w.benutzer_id
    where w.status <> 'abgelehnt' and w.von <= p_bis and w.bis >= p_von), '[]'::jsonb);
end $$;

/** Daten für die Urlaubsseite: eigene Einträge, Konto-Grundlage und (für den Inhaber) offene Anträge */
create or replace function public.urlaub_uebersicht(p_jahr integer) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
begin
  return jsonb_build_object(
    'meine', coalesce((select jsonb_agg(to_jsonb(w) order by w.von) from abwesenheit w where w.benutzer_id = ich.id), '[]'::jsonb),
    'konto', (select to_jsonb(k) from urlaubskonto k where k.benutzer_id = ich.id and k.jahr = p_jahr),
    'offen', case when ich.rolle = 'inhaber' then coalesce((
        select jsonb_agg(to_jsonb(w) || jsonb_build_object('name', p.name) order by w.von)
        from abwesenheit w join profil p on p.id = w.benutzer_id where w.status = 'beantragt'), '[]'::jsonb) end);
end $$;

create or replace function public.abwesenheit(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
  w abwesenheit;
begin
  select * into w from abwesenheit where id = p_id;
  if w.id is null then return null; end if;
  if not intern.ist_planer(ich) and w.benutzer_id <> ich.id then raise exception 'Dafür fehlt die Berechtigung.'; end if;
  return jsonb_build_object(
    'a', to_jsonb(w),
    'name', (select name from profil where id = w.benutzer_id),
    'andere', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'name', p.name, 'von', x.von, 'bis', x.bis, 'status', x.status) order by x.von)
      from abwesenheit x join profil p on p.id = x.benutzer_id
      where x.benutzer_id <> w.benutzer_id and x.status <> 'abgelehnt' and x.von <= w.bis and x.bis >= w.von), '[]'::jsonb),
    'einsaetze', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'datum', e.datum, 'art', e.art, 'kunde', k.name) order by e.datum)
      from einsatz e join kunde k on k.id = e.kunde_id
      where e.monteur_id = w.benutzer_id and e.datum between w.von and w.bis and e.status <> 'abgeschlossen'), '[]'::jsonb),
    'team_groesse', (select count(*) from profil where aktiv and im_team));
end $$;

/** Neue Abwesenheit. Monteure beantragen nur Urlaub für sich; Urlaub vom Inhaber und Krankheit usw. gelten sofort.
    p_tage (Arbeitstage, berechnet von der App mit den Feiertagen) erscheint nur in der Benachrichtigung. */
create or replace function public.abwesenheit_eintragen(p_daten jsonb, p_tage numeric default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
  w abwesenheit := jsonb_populate_record(null::abwesenheit, p_daten);
  mitarbeiter profil;
  doppelt abwesenheit;
  neu_status abwesenheitsstatus;
  neu uuid;
  i record;
begin
  if not intern.ist_planer(ich) then
    w.benutzer_id := ich.id;
    w.art := 'urlaub';
  end if;
  w.benutzer_id := coalesce(w.benutzer_id, ich.id);
  if w.art is null or w.von is null then raise exception 'Bitte Art und Datum angeben.'; end if;
  w.bis := coalesce(w.bis, w.von);
  if w.bis < w.von then raise exception '„Bis“ darf nicht vor „Von“ liegen.'; end if;
  if coalesce(w.halbtags, false) and w.von <> w.bis then raise exception 'Ein halber Tag geht nur bei einem einzelnen Tag.'; end if;
  select * into mitarbeiter from profil where id = w.benutzer_id and aktiv;
  if mitarbeiter.id is null then raise exception 'Mitarbeiter nicht gefunden.'; end if;
  select * into doppelt from abwesenheit
  where benutzer_id = w.benutzer_id and status <> 'abgelehnt' and von <= w.bis and bis >= w.von limit 1;
  if doppelt.id is not null then
    raise exception 'Für diesen Zeitraum ist schon eine Abwesenheit eingetragen (% – %).',
      intern.datum_de(doppelt.von), intern.datum_de(doppelt.bis);
  end if;
  neu_status := case when w.art <> 'urlaub' or ich.rolle = 'inhaber' then 'genehmigt' else 'beantragt' end;
  insert into abwesenheit (benutzer_id, art, von, bis, halbtags, status, bemerkung, eingetragen_von, entschieden_von, entschieden_am)
  values (w.benutzer_id, w.art, w.von, w.bis, coalesce(w.halbtags, false), neu_status, nullif(trim(w.bemerkung), ''), ich.id,
          case when neu_status = 'genehmigt' and w.art = 'urlaub' then ich.id end,
          case when neu_status = 'genehmigt' and w.art = 'urlaub' then now() end)
  returning id into neu;
  if neu_status = 'beantragt' then
    for i in select email from profil where rolle = 'inhaber' and aktiv loop
      perform intern.mail_einreihen(i.email, 'Urlaubsantrag von ' || mitarbeiter.name,
        mitarbeiter.name || ' beantragt Urlaub vom ' || intern.datum_de(w.von) || ' bis ' || intern.datum_de(w.bis)
        || coalesce(' (' || replace(trim_scale(p_tage)::text, '.', ',') || case when p_tage = 1 then ' Tag)' else ' Tage)' end, '')
        || '.' || chr(10) || chr(10) || 'Bitte in der App unter „Urlaub“ genehmigen oder ablehnen.');
    end loop;
  end if;
  return neu;
end $$;

create or replace function public.abwesenheit_entscheiden(p_id uuid, p_genehmigt boolean, p_kommentar text) returns void
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe(array['inhaber']::rolle[]);
  w abwesenheit;
  m profil;
begin
  select * into w from abwesenheit where id = p_id;
  if w.id is null then raise exception 'Antrag nicht gefunden.'; end if;
  if w.status <> 'beantragt' then raise exception 'Über diesen Antrag wurde schon entschieden.'; end if;
  if not p_genehmigt and coalesce(trim(p_kommentar), '') = '' then
    raise exception 'Bitte kurz begründen, warum der Antrag abgelehnt wird.';
  end if;
  update abwesenheit set status = case when p_genehmigt then 'genehmigt'::abwesenheitsstatus else 'abgelehnt' end,
    entscheidung_kommentar = nullif(trim(p_kommentar), ''), entschieden_von = ich.id, entschieden_am = now()
  where id = p_id;
  select * into m from profil where id = w.benutzer_id;
  perform intern.mail_einreihen(m.email,
    'Dein Urlaub vom ' || intern.datum_de(w.von) || ' wurde ' || case when p_genehmigt then 'genehmigt' else 'abgelehnt' end,
    'Hallo ' || m.name || ',' || chr(10) || chr(10) || 'dein Urlaubsantrag vom ' || intern.datum_de(w.von) || ' bis '
    || intern.datum_de(w.bis) || ' wurde ' || case when p_genehmigt then 'genehmigt' else 'abgelehnt' end || '.'
    || coalesce(chr(10) || chr(10) || 'Kommentar: ' || nullif(trim(p_kommentar), ''), '')
    || chr(10) || chr(10) || 'Viele Grüße' || chr(10) || ich.name);
end $$;

/** Mitarbeiter ziehen offene Anträge zurück; Inhaber und Büro können jeden Eintrag löschen. */
create or replace function public.abwesenheit_loeschen(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ich profil := intern.pruefe();
  w abwesenheit;
begin
  select * into w from abwesenheit where id = p_id;
  if w.id is null then return; end if;
  if not (intern.ist_planer(ich) or (w.benutzer_id = ich.id and w.status = 'beantragt')) then
    raise exception 'Dafür fehlt die Berechtigung.';
  end if;
  delete from abwesenheit where id = p_id;
end $$;

create or replace function public.urlaubskonten(p_jahr integer) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform intern.pruefe(array['inhaber']::rolle[]);
  return jsonb_build_object(
    'konten', coalesce((select jsonb_agg(to_jsonb(k)) from urlaubskonto k where k.jahr = p_jahr), '[]'::jsonb),
    'urlaub', coalesce((
      select jsonb_agg(to_jsonb(w)) from abwesenheit w
      where w.art = 'urlaub' and w.status <> 'abgelehnt'
        and w.von <= make_date(p_jahr, 12, 31) and w.bis >= make_date(p_jahr, 1, 1)), '[]'::jsonb));
end $$;

create or replace function public.konto_speichern(p_benutzer_id uuid, p_jahr integer, p_anspruch integer, p_uebertrag_halbe integer)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform intern.pruefe(array['inhaber']::rolle[]);
  if p_anspruch not between 0 and 60 or p_uebertrag_halbe not between 0 and 120 then
    raise exception 'Bitte gültige Werte angeben (Anspruch 0–60 Tage).';
  end if;
  insert into urlaubskonto (benutzer_id, jahr, anspruch_tage, uebertrag_halbe_tage)
  values (p_benutzer_id, p_jahr, p_anspruch, p_uebertrag_halbe)
  on conflict (benutzer_id, jahr) do update set anspruch_tage = excluded.anspruch_tage, uebertrag_halbe_tage = excluded.uebertrag_halbe_tage;
end $$;
