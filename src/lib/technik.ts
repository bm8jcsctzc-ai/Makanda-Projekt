import type {
  Antwort,
  Anlagentyp,
  Benutzer,
  Einsatz,
  Einsatzart,
  Einsatzstatus,
  Fotokategorie,
  Pruefpunkt,
  Rolle,
} from "@/db/schema";

export const ANLAGENTYPEN: Record<Anlagentyp, string> = {
  gas: "Gasheizung",
  oel: "Ölheizung",
  waermepumpe: "Wärmepumpe",
  klima: "Klimaanlage",
  sonstige: "Sonstige Anlage",
};

export const EINSATZARTEN: Record<Einsatzart, string> = {
  wartung: "Wartung",
  stoerung: "Störung",
  montage: "Montage",
  sonstiges: "Sonstiges",
};

export const EINSATZSTATUS: Record<Einsatzstatus, { text: string; klasse: string }> = {
  geplant: { text: "geplant", klasse: "bg-slate-100 text-slate-700" },
  in_arbeit: { text: "in Arbeit", klasse: "bg-amber-100 text-amber-800" },
  abgeschlossen: { text: "erledigt", klasse: "bg-green-100 text-green-800" },
};

export const FOTOKATEGORIEN: Record<Fotokategorie, string> = {
  typenschild: "Typenschild",
  vorher: "Vorher",
  nachher: "Nachher",
  messwert: "Messwert / Anzeige",
  schaden: "Schaden / Mangel",
  sonstiges: "Sonstiges",
};

// Wer Einsätze plant, Kunden anlegt und Checklisten-Vorlagen pflegt
export const DARF_PLANEN: Rolle[] = ["inhaber", "buero"];

/** Inhaber und Büro dürfen jeden Einsatz bearbeiten, Monteure nur ihre eigenen. */
export function darfEinsatzBearbeiten(b: Pick<Benutzer, "id" | "rolle">, e: Pick<Einsatz, "monteurId">) {
  return DARF_PLANEN.includes(b.rolle) || e.monteurId === b.id;
}

/** "12,5" oder "12.5" → 12.5; ungültig → null */
export function parseZahl(wert: string | undefined): number | null {
  if (wert == null || wert.trim() === "") return null;
  const s = wert.trim().replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

/** Liegt ein Messwert außerhalb der Grenzen des Prüfpunkts? */
export function istAusserhalb(punkt: Pruefpunkt, wert: string | undefined): boolean {
  if (punkt.typ !== "messwert") return false;
  const zahl = parseZahl(wert);
  if (zahl == null) return false;
  return (punkt.min != null && zahl < punkt.min) || (punkt.max != null && zahl > punkt.max);
}

export type Pruefergebnis = {
  /** Pflichtpunkte ohne gültige Antwort */
  fehlend: Pruefpunkt[];
  /** Messwerte, die keine Zahl sind */
  ungueltig: Pruefpunkt[];
  /** Prüfungen mit "nicht in Ordnung" */
  maengel: Pruefpunkt[];
  /** Messwerte außerhalb der Grenzen */
  ausserhalb: Pruefpunkt[];
};

export function pruefeChecklist(punkte: Pruefpunkt[], antworten: Record<string, Antwort>): Pruefergebnis {
  const e: Pruefergebnis = { fehlend: [], ungueltig: [], maengel: [], ausserhalb: [] };
  for (const punkt of punkte) {
    const wert = antworten[punkt.id]?.wert?.trim();
    if (!wert) {
      if (punkt.pflicht) e.fehlend.push(punkt);
      continue;
    }
    if (punkt.typ === "messwert" && parseZahl(wert) == null) e.ungueltig.push(punkt);
    if (punkt.typ === "pruefung" && wert === "nio") e.maengel.push(punkt);
    if (istAusserhalb(punkt, wert)) e.ausserhalb.push(punkt);
  }
  return e;
}

/** Datum + Monate, z. B. 2026-01-31 + 1 → 2026-02-28 */
export function plusMonate(datum: string, monate: number): string {
  const [j, m, t] = datum.split("-").map(Number);
  const ziel = new Date(Date.UTC(j, m - 1 + monate, 1));
  const letzterTag = new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0)).getUTCDate();
  ziel.setUTCDate(Math.min(t, letzterTag));
  return ziel.toISOString().slice(0, 10);
}

/** Kurzbeschreibung einer Anlage, z. B. "Viessmann Vitodens 200 (Gasheizung)" */
export function anlagenName(a: {
  typ: Anlagentyp;
  bezeichnung?: string | null;
  hersteller?: string | null;
  modell?: string | null;
}): string {
  const name = a.bezeichnung || [a.hersteller, a.modell].filter(Boolean).join(" ");
  return name ? `${name} (${ANLAGENTYPEN[a.typ]})` : ANLAGENTYPEN[a.typ];
}

export function adresse(k: { strasse?: string | null; plz?: string | null; ort?: string | null }): string {
  return [k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

/** Link für die Navigations-App auf dem Handy */
export function navigationsLink(k: { strasse?: string | null; plz?: string | null; ort?: string | null }) {
  const a = adresse(k);
  return a ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}` : null;
}

/** Datum + Tage, z. B. 2026-10-28 + 7 → 2026-11-04 */
export function plusTage(datum: string, tage: number): string {
  return new Date(Date.parse(`${datum}T00:00:00Z`) + tage * 86400000).toISOString().slice(0, 10);
}
