-- Kunden-Import aus TAIFUN (Excel/CSV, eingelesen im Browser).
-- Vorhandene Kunden werden über die TAIFUN-Kundennummer erkannt, ohne Nummer über Name + PLZ.
-- Leere Felder in der Datei überschreiben nichts – Hinweise, Erinnerungen und Anlagen bleiben unberührt.

create index if not exists kunde_taifun_kundennr on kunde (taifun_kundennr);

create or replace function public.kunden_importieren(p_kunden jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  k kunde;
  vorhanden uuid;
  neu integer := 0;
  aktualisiert integer := 0;
begin
  perform intern.pruefe(intern.planer());
  if jsonb_typeof(p_kunden) <> 'array' then raise exception 'Ungültige Daten.'; end if;
  if jsonb_array_length(p_kunden) > 1000 then raise exception 'Bitte höchstens 1000 Kunden auf einmal.'; end if;

  for k in select * from jsonb_populate_recordset(null::kunde, p_kunden) loop
    k.name := nullif(trim(k.name), '');
    if k.name is null then continue; end if;
    k.taifun_kundennr := nullif(trim(k.taifun_kundennr), '');
    vorhanden := null;
    if k.taifun_kundennr is not null then
      select id into vorhanden from kunde where taifun_kundennr = k.taifun_kundennr order by erstellt_am limit 1;
    end if;
    if vorhanden is null then
      select id into vorhanden from kunde
      where lower(name) = lower(k.name) and coalesce(plz, '') = coalesce(nullif(trim(k.plz), ''), '')
        and (taifun_kundennr is null or k.taifun_kundennr is null)
      order by erstellt_am limit 1;
    end if;

    if vorhanden is null then
      insert into kunde (name, ansprechpartner, strasse, plz, ort, telefon, email, taifun_kundennr)
      values (k.name, nullif(trim(k.ansprechpartner), ''), nullif(trim(k.strasse), ''), nullif(trim(k.plz), ''),
              nullif(trim(k.ort), ''), nullif(trim(k.telefon), ''), nullif(lower(trim(k.email)), ''), k.taifun_kundennr);
      neu := neu + 1;
    else
      update kunde set
        name = k.name,
        ansprechpartner = coalesce(nullif(trim(k.ansprechpartner), ''), ansprechpartner),
        strasse = coalesce(nullif(trim(k.strasse), ''), strasse),
        plz = coalesce(nullif(trim(k.plz), ''), plz),
        ort = coalesce(nullif(trim(k.ort), ''), ort),
        telefon = coalesce(nullif(trim(k.telefon), ''), telefon),
        email = coalesce(nullif(lower(trim(k.email)), ''), email),
        taifun_kundennr = coalesce(k.taifun_kundennr, taifun_kundennr)
      where id = vorhanden;
      aktualisiert := aktualisiert + 1;
    end if;
  end loop;
  return jsonb_build_object('neu', neu, 'aktualisiert', aktualisiert);
end $$;

revoke execute on function public.kunden_importieren(jsonb) from public, anon;
grant execute on function public.kunden_importieren(jsonb) to authenticated;
