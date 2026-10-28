// Erzeugt supabase/migrations/0005_startdaten.sql: npx tsx scripts/startdaten-erzeugen.ts > supabase/migrations/0005_startdaten.sql
import { START_VORLAGEN } from "@/lib/checklisten-vorlagen";
import { STANDARD_BETREFF, STANDARD_TEXT } from "@/lib/wartungsplan";
const q = (s: string | null) => (s == null ? "null" : `'${s.replace(/'/g, "''")}'`);
const zeilen = START_VORLAGEN.map(
  (v) => `  (${q(v.name)}, ${v.anlagentyp ? q(v.anlagentyp) : "null"}::anlagentyp, ${v.istWartung}, ${q(JSON.stringify(v.punkte))}::jsonb)`,
);
console.log(`-- Startdaten: Checklisten-Vorlagen (Vorschlag, in der App anpassbar) und Einstellungen.
-- Erzeugt aus src/lib/checklisten-vorlagen.ts und src/lib/wartungsplan.ts.

insert into checkliste_vorlage (name, anlagentyp, ist_wartung, punkte)
select * from (values
${zeilen.join(",\n")}
) as v(name, anlagentyp, ist_wartung, punkte)
where not exists (select 1 from checkliste_vorlage);

-- Der Betrieb sitzt in Baden-Württemberg (Feiertage im Urlaubsplaner)
insert into einstellungen (id, erinnerung_betreff, erinnerung_text, bundesland)
values (1, ${q(STANDARD_BETREFF)}, ${q(STANDARD_TEXT)}, 'BW')
on conflict (id) do nothing;`);
