import { plusTage } from "./technik";
import type { EinsatzZeile } from "./typen";

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
  if (datum === heute) return `Heute · ${text}`;
  if (datum === plusTage(heute, 1)) return `Morgen · ${text}`;
  return text;
}
