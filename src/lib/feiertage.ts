// Gesetzliche Feiertage in Deutschland, abhängig vom Bundesland.
// Nicht berücksichtigt: Feiertage, die nur in einzelnen Gemeinden gelten (z. B. Fronleichnam in Teilen
// von Sachsen und Thüringen, Augsburger Friedensfest) und einmalige Feiertage. Mariä Himmelfahrt zählt in ganz
// Bayern, obwohl er in einigen evangelisch geprägten Gemeinden kein Feiertag ist.

export const BUNDESLAENDER = {
  BW: "Baden-Württemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
} as const;

export type Bundesland = keyof typeof BUNDESLAENDER;

function iso(j: number, m: number, t: number) {
  return new Date(Date.UTC(j, m - 1, t)).toISOString().slice(0, 10);
}

/** Ostersonntag nach der Gaußschen Osterformel (gregorianischer Kalender) */
export function ostersonntag(jahr: number): string {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(jahr, monat, tag);
}

function plusTage(datum: string, tage: number) {
  return new Date(Date.parse(`${datum}T00:00:00Z`) + tage * 86400000).toISOString().slice(0, 10);
}

/** Alle Feiertage eines Jahres als Map Datum → Name */
export function feiertage(jahr: number, land: Bundesland | null): Map<string, string> {
  const ostern = ostersonntag(jahr);
  const liste: [string, string, Bundesland[] | null][] = [
    [iso(jahr, 1, 1), "Neujahr", null],
    [iso(jahr, 1, 6), "Heilige Drei Könige", ["BW", "BY", "ST"]],
    [iso(jahr, 3, 8), "Internationaler Frauentag", ["BE", "MV"]],
    [plusTage(ostern, -2), "Karfreitag", null],
    [plusTage(ostern, 1), "Ostermontag", null],
    [iso(jahr, 5, 1), "Tag der Arbeit", null],
    [plusTage(ostern, 39), "Christi Himmelfahrt", null],
    [plusTage(ostern, 50), "Pfingstmontag", null],
    [plusTage(ostern, 60), "Fronleichnam", ["BW", "BY", "HE", "NW", "RP", "SL"]],
    // In Bayern nur in Gemeinden mit überwiegend katholischer Bevölkerung – das ist die große Mehrheit
    [iso(jahr, 8, 15), "Mariä Himmelfahrt", ["BY", "SL"]],
    [iso(jahr, 9, 20), "Weltkindertag", ["TH"]],
    [iso(jahr, 10, 3), "Tag der Deutschen Einheit", null],
    [iso(jahr, 10, 31), "Reformationstag", ["BB", "HB", "HH", "MV", "NI", "SN", "ST", "SH", "TH"]],
    [iso(jahr, 11, 1), "Allerheiligen", ["BW", "BY", "NW", "RP", "SL"]],
    [bussUndBettag(jahr), "Buß- und Bettag", ["SN"]],
    [iso(jahr, 12, 25), "1. Weihnachtstag", null],
    [iso(jahr, 12, 26), "2. Weihnachtstag", null],
  ];
  return new Map(liste.filter(([, , laender]) => !laender || (land && laender.includes(land))).map(([d, n]) => [d, n]));
}

/** Mittwoch vor dem 23. November */
function bussUndBettag(jahr: number): string {
  const d = new Date(Date.UTC(jahr, 10, 22));
  const rueckwaerts = (d.getUTCDay() - 3 + 7) % 7;
  return plusTage(d.toISOString().slice(0, 10), -rueckwaerts);
}

const cache = new Map<string, Map<string, string>>();

/** Name des Feiertags an diesem Datum oder null */
export function feiertag(datum: string, land: Bundesland | null): string | null {
  const schluessel = `${datum.slice(0, 4)}-${land ?? ""}`;
  if (!cache.has(schluessel)) cache.set(schluessel, feiertage(Number(datum.slice(0, 4)), land));
  return cache.get(schluessel)!.get(datum) ?? null;
}

export function istWochenende(datum: string): boolean {
  const tag = new Date(`${datum}T00:00:00Z`).getUTCDay();
  return tag === 0 || tag === 6;
}

export function istArbeitstag(datum: string, land: Bundesland | null): boolean {
  return !istWochenende(datum) && !feiertag(datum, land);
}
