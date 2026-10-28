import type { Fixkosten, Intervall, Personalkosten, Rechnung } from "@/db/schema";

export const KATEGORIEN = [
  "Material / Großhandel",
  "Werkzeug & Geräte",
  "Fahrzeuge",
  "Kraftstoff",
  "Miete & Nebenkosten",
  "Versicherungen",
  "Telefon & Internet",
  "Software & EDV",
  "Steuerberater & Gebühren",
  "Werbung",
  "Arbeitskleidung",
  "Fortbildung",
  "Sonstiges",
] as const;

export const INTERVALLE: Record<Intervall, { name: string; monate: number }> = {
  monatlich: { name: "monatlich", monate: 1 },
  vierteljaehrlich: { name: "vierteljährlich", monate: 3 },
  halbjaehrlich: { name: "halbjährlich", monate: 6 },
  jaehrlich: { name: "jährlich", monate: 12 },
};

export const MWST_SAETZE = [19, 7, 0] as const;

export function nettoAusBrutto(bruttoCent: number, mwstSatz: number): number {
  return Math.round((bruttoCent * 100) / (100 + mwstSatz));
}

/** Fixkosten auf einen Monat umgerechnet, z. B. 1200 € jährlich → 100 € */
export function fixkostenProMonat(f: Pick<Fixkosten, "betragCent" | "intervall">): number {
  return Math.round(f.betragCent / INTERVALLE[f.intervall].monate);
}

function monatsGrenzen(monat: string) {
  const [j, m] = monat.split("-").map(Number);
  const letzterTag = new Date(Date.UTC(j, m, 0)).getUTCDate();
  return { erster: `${monat}-01`, letzter: `${monat}-${String(letzterTag).padStart(2, "0")}` };
}

/** Ist ein Eintrag mit Laufzeit von–bis in diesem Monat (Format "YYYY-MM") gültig? */
export function istImMonatAktiv(von: string, bis: string | null, monat: string): boolean {
  const { erster, letzter } = monatsGrenzen(monat);
  return von <= letzter && (bis == null || bis >= erster);
}

/** Die letzten `anzahl` Monate bis einschließlich `bisMonat`, älteste zuerst */
export function letzteMonate(bisMonat: string, anzahl: number): string[] {
  const [j, m] = bisMonat.split("-").map(Number);
  return Array.from({ length: anzahl }, (_, i) => {
    const d = new Date(Date.UTC(j, m - 1 - (anzahl - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export function personalkostenGesamt(p: Pick<Personalkosten, "bruttoCent" | "arbeitgeberanteilCent">) {
  return p.bruttoCent + p.arbeitgeberanteilCent;
}

export type MonatsWerte = {
  monat: string;
  rechnungenCent: number;
  fixkostenCent: number;
  personalCent: number;
  gesamtCent: number;
};

/** Alle Kosten eines Monats. Rechnungen zählen im Monat ihres Rechnungsdatums. */
export function monatsWerte(
  monat: string,
  rechnungen: Pick<Rechnung, "rechnungsdatum" | "bruttoCent">[],
  fixkosten: Pick<Fixkosten, "betragCent" | "intervall" | "beginn" | "ende">[],
  personal: Pick<Personalkosten, "bruttoCent" | "arbeitgeberanteilCent" | "gueltigAb" | "gueltigBis">[] | null,
): MonatsWerte {
  const rechnungenCent = rechnungen
    .filter((r) => r.rechnungsdatum.startsWith(monat))
    .reduce((s, r) => s + r.bruttoCent, 0);
  const fixkostenCent = fixkosten
    .filter((f) => istImMonatAktiv(f.beginn, f.ende, monat))
    .reduce((s, f) => s + fixkostenProMonat(f), 0);
  const personalCent = (personal ?? [])
    .filter((p) => istImMonatAktiv(p.gueltigAb, p.gueltigBis, monat))
    .reduce((s, p) => s + personalkostenGesamt(p), 0);
  return {
    monat,
    rechnungenCent,
    fixkostenCent,
    personalCent,
    gesamtCent: rechnungenCent + fixkostenCent + personalCent,
  };
}

/** Kosten eines Monats nach Kategorie (Rechnungen + umgerechnete Fixkosten), größte zuerst */
export function nachKategorie(
  monat: string,
  rechnungen: Pick<Rechnung, "rechnungsdatum" | "bruttoCent" | "kategorie">[],
  fixkosten: Pick<Fixkosten, "betragCent" | "intervall" | "beginn" | "ende" | "kategorie">[],
): { kategorie: string; cent: number }[] {
  const summen = new Map<string, number>();
  for (const r of rechnungen) {
    if (r.rechnungsdatum.startsWith(monat)) summen.set(r.kategorie, (summen.get(r.kategorie) ?? 0) + r.bruttoCent);
  }
  for (const f of fixkosten) {
    if (istImMonatAktiv(f.beginn, f.ende, monat)) {
      summen.set(f.kategorie, (summen.get(f.kategorie) ?? 0) + fixkostenProMonat(f));
    }
  }
  return [...summen.entries()]
    .map(([kategorie, cent]) => ({ kategorie, cent }))
    .sort((a, b) => b.cent - a.cent);
}
