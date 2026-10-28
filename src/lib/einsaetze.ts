import { and, asc, eq, gte, lte, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { anlage, benutzer, einsatz, kunde } from "@/db/schema";
import type { EinsatzZeile } from "@/components/EinsatzListe";
import { plusTage } from "./technik";

/** Einsätze mit Kunde, Anlage und Monteur, sortiert nach Datum und Uhrzeit */
export async function ladeEinsaetze(filter: { von?: string; bis?: string; monteurId?: string; extra?: SQL }): Promise<EinsatzZeile[]> {
  const db = await getDb();
  const bedingungen = [
    filter.von ? gte(einsatz.datum, filter.von) : undefined,
    filter.bis ? lte(einsatz.datum, filter.bis) : undefined,
    filter.monteurId ? eq(einsatz.monteurId, filter.monteurId) : undefined,
    filter.extra,
  ].filter(Boolean) as SQL[];
  return db
    .select({ e: einsatz, k: kunde, a: anlage, monteur: benutzer.name })
    .from(einsatz)
    .innerJoin(kunde, eq(einsatz.kundeId, kunde.id))
    .leftJoin(anlage, eq(einsatz.anlageId, anlage.id))
    .leftJoin(benutzer, eq(einsatz.monteurId, benutzer.id))
    .where(and(...bedingungen))
    .orderBy(asc(einsatz.datum), asc(einsatz.uhrzeit));
}

/** Gruppiert nach Datum (Reihenfolge bleibt erhalten) */
export function nachDatum(zeilen: EinsatzZeile[]): [string, EinsatzZeile[]][] {
  const gruppen = new Map<string, EinsatzZeile[]>();
  for (const z of zeilen) gruppen.set(z.e.datum, [...(gruppen.get(z.e.datum) ?? []), z]);
  return [...gruppen.entries()];
}

const WOCHENTAG = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** "2026-10-28" → "Mittwoch, 28. Oktober" (mit "Heute"/"Morgen") */
export function tagesTitel(datum: string, heute: string): string {
  const text = WOCHENTAG.format(new Date(`${datum}T00:00:00Z`));
  const morgen = plusTage(heute, 1);
  if (datum === heute) return `Heute · ${text}`;
  if (datum === morgen) return `Morgen · ${text}`;
  return text;
}
