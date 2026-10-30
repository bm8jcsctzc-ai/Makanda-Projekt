import type { Abwesenheit, Abwesenheitsart, Abwesenheitsstatus, Rolle } from "@/db/schema";
import { istArbeitstag, type Bundesland } from "./feiertage";

export const ARTEN: Record<Abwesenheitsart, { name: string; farbe: string; hell: string }> = {
  // „hell“ = halbtransparent, damit es auf hellem und dunklem Hintergrund passt
  urlaub: { name: "Urlaub", farbe: "#2a78d6", hell: "#2a78d64d" },
  krank: { name: "Krank", farbe: "#e34948", hell: "#e349484d" },
  berufsschule: { name: "Berufsschule", farbe: "#6250d6", hell: "#6250d64d" },
  sonstiges: { name: "Sonstiges", farbe: "#64748b", hell: "#64748b4d" },
};

export const STATUS: Record<Abwesenheitsstatus, { text: string; klasse: string }> = {
  beantragt: { text: "beantragt", klasse: "bg-amber-100 text-amber-800" },
  genehmigt: { text: "genehmigt", klasse: "bg-green-100 text-green-800" },
  abgelehnt: { text: "abgelehnt", klasse: "bg-slate-200 text-slate-600" },
};

// Wer für alle Mitarbeiter eintragen darf (Krankheit, Berufsschule) und wer Urlaub genehmigt
export const DARF_EINTRAGEN: Rolle[] = ["inhaber", "buero"];
export const DARF_GENEHMIGEN: Rolle[] = ["inhaber"];

/** Alle Tage von–bis (einschließlich) */
export function tage(von: string, bis: string): string[] {
  const liste: string[] = [];
  for (let t = Date.parse(`${von}T00:00:00Z`); t <= Date.parse(`${bis}T00:00:00Z`); t += 86400000) {
    liste.push(new Date(t).toISOString().slice(0, 10));
  }
  return liste;
}

/** Arbeitstage einer Abwesenheit (ohne Wochenenden und Feiertage), optional nur innerhalb eines Jahres */
export function arbeitstage(
  a: Pick<Abwesenheit, "von" | "bis" | "halbtags">,
  land: Bundesland | null,
  nurJahr?: number,
): number {
  const anzahl = tage(a.von, a.bis).filter(
    (d) => istArbeitstag(d, land) && (nurJahr == null || d.startsWith(String(nurJahr))),
  ).length;
  return a.halbtags && anzahl === 1 ? 0.5 : anzahl;
}

export function ueberschneidet(a: Pick<Abwesenheit, "von" | "bis">, b: Pick<Abwesenheit, "von" | "bis">): boolean {
  return a.von <= b.bis && b.von <= a.bis;
}

export type Konto = {
  anspruch: number;
  uebertrag: number;
  genehmigt: number;
  beantragt: number;
  /** Anspruch + Übertrag − genehmigt − beantragt */
  rest: number;
};

/** Urlaubskonto eines Mitarbeiters für ein Jahr. Urlaub über den Jahreswechsel zählt anteilig. */
export function konto(
  abwesenheiten: Pick<Abwesenheit, "art" | "status" | "von" | "bis" | "halbtags">[],
  jahr: number,
  anspruch: number,
  uebertragHalbeTage: number,
  land: Bundesland | null,
): Konto {
  const summe = (status: Abwesenheitsstatus) =>
    abwesenheiten
      .filter((a) => a.art === "urlaub" && a.status === status)
      .reduce((s, a) => s + arbeitstage(a, land, jahr), 0);
  const uebertrag = uebertragHalbeTage / 2;
  const genehmigt = summe("genehmigt");
  const beantragt = summe("beantragt");
  return { anspruch, uebertrag, genehmigt, beantragt, rest: anspruch + uebertrag - genehmigt - beantragt };
}

export function formatTage(n: number): string {
  const text = n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  return `${text} ${n === 1 ? "Tag" : "Tage"}`;
}
