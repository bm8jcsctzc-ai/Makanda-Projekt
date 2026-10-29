// Kunden aus einer TAIFUN-Liste (Excel oder CSV) einlesen. Die Spalten werden an ihren Überschriften erkannt;
// was nicht passt, stellt man auf der Import-Seite von Hand um.

export const FELDER = {
  kundennr: { titel: "Kundennummer", namen: ["kundennr", "kundennummer", "kdnr", "kdnummer", "kundenr", "adressnr", "adressnummer", "adrnr", "debitor", "debitornr", "debitorennr", "debitorennummer", "personenkonto"] },
  name: { titel: "Name / Firma", namen: ["name", "name1", "firma", "firmenname", "firma1", "kunde", "kundenname", "nachname", "zuname"] },
  name2: { titel: "Namenszusatz", namen: ["name2", "namenszusatz", "zusatz", "firma2", "name3"] },
  vorname: { titel: "Vorname", namen: ["vorname"] },
  ansprechpartner: { titel: "Ansprechpartner", namen: ["ansprechpartner", "ansprechperson", "kontakt", "kontaktperson", "zhd", "zuhaendenvon"] },
  strasse: { titel: "Straße", namen: ["strasse", "str", "strassehausnr", "strassehausnummer", "strassenr", "anschrift", "adresse", "hausanschrift"] },
  hausnr: { titel: "Hausnummer", namen: ["hausnr", "hausnummer", "hnr"] },
  plz: { titel: "PLZ", namen: ["plz", "postleitzahl"] },
  ort: { titel: "Ort", namen: ["ort", "stadt", "wohnort", "ortsteil"] },
  plzOrt: { titel: "PLZ und Ort (zusammen)", namen: ["plzort", "plzundort", "postleitzahlort"] },
  telefon: { titel: "Telefon", namen: ["telefon", "tel", "telefon1", "tel1", "telefonnummer", "telnr", "festnetz", "telefonprivat", "telefongeschaeftlich", "telefonfirma"] },
  mobil: { titel: "Mobil", namen: ["mobil", "handy", "mobiltelefon", "mobilnummer", "mobilfunk", "telefon2", "tel2", "handynummer"] },
  email: { titel: "E-Mail", namen: ["email", "mail", "emailadresse", "email1", "mailadresse", "emailprivat", "emailgeschaeftlich"] },
} as const;

export type Feld = keyof typeof FELDER;
/** Feld → Spaltennummer (oder -1 = nicht übernehmen) */
export type Zuordnung = Record<Feld, number>;

export type ImportKunde = {
  taifun_kundennr: string | null;
  name: string;
  ansprechpartner: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  telefon: string | null;
  email: string | null;
};

/** Überschrift vergleichbar machen: „E-Mail-Adresse“ → „emailadresse“, „Straße“ → „strasse“ */
export function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

export function spaltenErkennen(kopf: string[]): Zuordnung {
  const normal = kopf.map(normalisiere);
  const vergeben = new Set<number>();
  const zuordnung = {} as Zuordnung;
  for (const feld of Object.keys(FELDER) as Feld[]) {
    const i = normal.findIndex((n, j) => !vergeben.has(j) && (FELDER[feld].namen as readonly string[]).includes(n));
    zuordnung[feld] = i;
    if (i >= 0) vergeben.add(i);
  }
  return zuordnung;
}

/** Datei als Text: TAIFUN speichert CSV oft im Windows-Zeichensatz, nicht in UTF-8 */
export function dekodieren(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** CSV mit Semikolon, Komma oder Tabulator; Anführungszeichen und Zeilenumbrüche in Feldern werden beachtet */
export function csvParsen(text: string): string[][] {
  const ersteZeile = text.split(/\r?\n/, 1)[0] ?? "";
  const trenner = [";", "\t", ","].reduce((best, t) => (ersteZeile.split(t).length > ersteZeile.split(best).length ? t : best), ";");
  const zeilen: string[][] = [];
  let zeile: string[] = [];
  let feld = "";
  let inAnfuehrung = false;
  for (let i = 0; i < text.length; i++) {
    const z = text[i];
    if (inAnfuehrung) {
      if (z === '"' && text[i + 1] === '"') {
        feld += '"';
        i++;
      } else if (z === '"') {
        inAnfuehrung = false;
      } else {
        feld += z;
      }
    } else if (z === '"' && feld === "") {
      inAnfuehrung = true;
    } else if (z === trenner) {
      zeile.push(feld);
      feld = "";
    } else if (z === "\n" || z === "\r") {
      if (z === "\r" && text[i + 1] === "\n") i++;
      zeile.push(feld);
      zeilen.push(zeile);
      zeile = [];
      feld = "";
    } else {
      feld += z;
    }
  }
  if (feld !== "" || zeile.length) {
    zeile.push(feld);
    zeilen.push(zeile);
  }
  return zeilen;
}

/** Erste Tabelle einer Excel-Datei als Text-Zeilen */
async function excelLesen(daten: ArrayBuffer): Promise<string[][]> {
  const { default: ExcelJS } = await import("exceljs");
  const mappe = new ExcelJS.Workbook();
  await mappe.xlsx.load(daten);
  const blatt = mappe.worksheets[0];
  if (!blatt) return [];
  const zeilen: string[][] = [];
  blatt.eachRow({ includeEmpty: false }, (row) => {
    const werte: string[] = [];
    for (let i = 1; i <= blatt.columnCount; i++) werte.push(row.getCell(i).text ?? "");
    zeilen.push(werte);
  });
  return zeilen;
}

/** Liest Excel (.xlsx) oder CSV und gibt Überschriften und Datenzeilen zurück */
export async function tabelleLesen(datei: File): Promise<{ kopf: string[]; zeilen: string[][] }> {
  const daten = await datei.arrayBuffer();
  const istExcel = /\.xlsx$/i.test(datei.name) || new Uint8Array(daten.slice(0, 2)).join() === "80,75"; // ZIP = xlsx
  if (/\.xls$/i.test(datei.name)) throw new Error("Das alte Excel-Format .xls geht nicht. Bitte in Excel „Speichern unter“ → „Excel-Arbeitsmappe (.xlsx)“ wählen oder als CSV exportieren.");
  const alle = (istExcel ? await excelLesen(daten) : csvParsen(dekodieren(new Uint8Array(daten))))
    .map((z) => z.map((w) => w.trim()))
    .filter((z) => z.some((w) => w !== ""));
  if (alle.length < 2) throw new Error("In der Datei wurden keine Kunden gefunden. Die erste Zeile muss die Spaltenüberschriften enthalten.");
  return { kopf: alle[0], zeilen: alle.slice(1) };
}

const verbinde = (...teile: (string | undefined)[]) => teile.map((t) => t?.trim()).filter(Boolean).join(" ");

/** Datenzeilen in Kunden umwandeln */
export function kundenAusZeilen(zeilen: string[][], z: Zuordnung) {
  const wert = (zeile: string[], feld: Feld) => (z[feld] >= 0 ? (zeile[z[feld]] ?? "").trim() : "");
  const kunden: ImportKunde[] = [];
  let ohneName = 0;
  let ungueltigeEmail = 0;
  for (const zeile of zeilen) {
    const name = verbinde(wert(zeile, "vorname"), wert(zeile, "name"), wert(zeile, "name2"));
    if (!name) {
      ohneName++;
      continue;
    }
    let plz = wert(zeile, "plz");
    let ort = wert(zeile, "ort");
    const plzOrt = wert(zeile, "plzOrt");
    if (plzOrt && !plz && !ort) {
      const m = plzOrt.match(/^(?:D-?)?(\d{4,5})\s+(.+)$/i);
      if (m) [plz, ort] = [m[1], m[2]];
      else ort = plzOrt;
    }
    // Excel macht aus „01067“ die Zahl 1067
    if (/^\d{4}$/.test(plz)) plz = `0${plz}`;
    const telefon = wert(zeile, "telefon");
    const mobil = wert(zeile, "mobil");
    let email = wert(zeile, "email").replace(/^mailto:/i, "");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      ungueltigeEmail++;
      email = "";
    }
    kunden.push({
      taifun_kundennr: wert(zeile, "kundennr") || null,
      name: name.slice(0, 200),
      ansprechpartner: wert(zeile, "ansprechpartner") || null,
      strasse: verbinde(wert(zeile, "strasse"), wert(zeile, "hausnr")) || null,
      plz: plz || null,
      ort: ort || null,
      telefon: telefon && mobil && telefon !== mobil ? `${telefon} / ${mobil}` : telefon || mobil || null,
      email: email.toLowerCase() || null,
    });
  }
  return { kunden, ohneName, ungueltigeEmail };
}
