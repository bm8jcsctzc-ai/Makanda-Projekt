const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatEuro(cent: number): string {
  return euro.format(cent / 100);
}

/** Wandelt eine Eingabe wie "1.234,56", "1234,5" oder "1234.56" in Cent um. Liefert null bei ungültiger Eingabe. */
export function parseEuro(eingabe: string): number | null {
  let s = eingabe.trim().replace(/€/g, "").replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    // Deutsches Format: Punkte sind Tausendertrenner
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" ohne Komma ist ebenfalls ein Tausendertrenner
    s = s.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

/** Cent als Eingabewert für ein Formularfeld, z. B. 123456 → "1234,56" */
export function centAlsEingabe(cent: number | null | undefined): string {
  if (cent == null) return "";
  return (cent / 100).toFixed(2).replace(".", ",");
}

/** "2026-10-28" → "28.10.2026" */
export function formatDatum(iso: string | null | undefined): string {
  if (!iso) return "–";
  const [j, m, t] = iso.slice(0, 10).split("-");
  return `${t}.${m}.${j}`;
}

const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/** "2026-10" → "Oktober 2026" */
export function formatMonat(monat: string): string {
  const [j, m] = monat.split("-").map(Number);
  return `${MONATE[m - 1]} ${j}`;
}

/** "2026-10" → "Okt 26" */
export function formatMonatKurz(monat: string): string {
  const [j, m] = monat.split("-").map(Number);
  return `${MONATE[m - 1].slice(0, 3)} ${String(j).slice(2)}`;
}

/** Heutiges Datum in deutscher Zeit als "YYYY-MM-DD" */
export function heute(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
}

const DATUM_ZEIT = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

/** Zeitpunkt in deutscher Zeit, z. B. "28.10.2026, 14:05" */
export function formatDatumZeit(zeitpunkt: Date): string {
  return DATUM_ZEIT.format(zeitpunkt);
}
