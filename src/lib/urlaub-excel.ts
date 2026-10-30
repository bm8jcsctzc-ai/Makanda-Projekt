import ExcelJS from "exceljs";
import type { Abwesenheit, Urlaubskonto } from "@/db/schema";
import type { Bundesland } from "./feiertage";
import type { AbwesenheitImKalender, TeamMitglied } from "./typen";
import { ARTEN, arbeitstage, konto, STATUS } from "./urlaub";

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const TAGE_FORMAT = "0.0;-0.0;0";

/** Datum "YYYY-MM-DD" als echtes Excel-Datum (ohne Zeitzonen-Verschiebung) */
const alsDatum = (iso: string) => new Date(`${iso}T12:00:00Z`);

function kopfzeile(blatt: ExcelJS.Worksheet) {
  blatt.getRow(1).font = { bold: true };
  blatt.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
}

export type UrlaubsDaten = {
  jahr: number;
  land: Bundesland | null;
  team: TeamMitglied[];
  konten: Urlaubskonto[];
  /** Urlaub (genehmigt und beantragt) aus urlaubskonten() */
  urlaub: Abwesenheit[];
  /** alle Abwesenheiten des Jahres (auch Krankheit, Berufsschule) */
  abwesenheiten: AbwesenheitImKalender[];
};

/** Excel mit Urlaubskonten, Urlaubstagen pro Monat und allen Abwesenheiten eines Jahres */
export async function urlaubsExcel({ jahr, land, team, konten, urlaub, abwesenheiten }: UrlaubsDaten): Promise<Uint8Array> {
  const mappe = new ExcelJS.Workbook();
  mappe.creator = "Makanda";
  mappe.created = new Date();
  const mitarbeiter = team.filter((m) => m.imTeam);

  // 1. Urlaubskonten
  const kontenBlatt = mappe.addWorksheet(`Urlaubskonten ${jahr}`, { views: [{ state: "frozen", ySplit: 1 }] });
  kontenBlatt.columns = [
    { header: "Mitarbeiter", key: "name", width: 24 },
    { header: "Anspruch", key: "anspruch", width: 11, style: { numFmt: TAGE_FORMAT } },
    { header: "Übertrag Vorjahr", key: "uebertrag", width: 16, style: { numFmt: TAGE_FORMAT } },
    { header: "Gesamt", key: "gesamt", width: 10, style: { numFmt: TAGE_FORMAT } },
    { header: "Genehmigt", key: "genehmigt", width: 12, style: { numFmt: TAGE_FORMAT } },
    { header: "Beantragt", key: "beantragt", width: 12, style: { numFmt: TAGE_FORMAT } },
    { header: "Rest", key: "rest", width: 10, style: { numFmt: TAGE_FORMAT } },
  ];
  kopfzeile(kontenBlatt);
  for (const m of mitarbeiter) {
    const eintrag = konten.find((k) => k.benutzerId === m.id);
    const k = konto(
      urlaub.filter((u) => u.benutzerId === m.id),
      jahr,
      eintrag?.anspruchTage ?? m.urlaubstageProJahr,
      eintrag?.uebertragHalbeTage ?? 0,
      land,
    );
    const zeile = kontenBlatt.addRow({
      name: m.name,
      anspruch: k.anspruch,
      uebertrag: k.uebertrag,
      gesamt: k.anspruch + k.uebertrag,
      genehmigt: k.genehmigt,
      beantragt: k.beantragt,
      rest: k.rest,
    });
    zeile.getCell("rest").font = { bold: true, ...(k.rest < 0 ? { color: { argb: "FFB91C1C" } } : {}) };
  }
  kontenBlatt.addRow([]);
  kontenBlatt.addRow([`Stand: ${new Date().toLocaleDateString("de-DE")} – Arbeitstage ohne Wochenenden und Feiertage`]).font = {
    italic: true,
    color: { argb: "FF64748B" },
  };

  // 2. Urlaubstage pro Monat (nur genehmigter Urlaub)
  const monatsBlatt = mappe.addWorksheet("Urlaub pro Monat", { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });
  monatsBlatt.columns = [
    { header: "Mitarbeiter", key: "name", width: 24 },
    ...MONATE.map((m, i) => ({ header: m, key: `m${i}`, width: 7, style: { numFmt: TAGE_FORMAT } })),
    { header: "Summe", key: "summe", width: 9, style: { numFmt: TAGE_FORMAT } },
  ];
  kopfzeile(monatsBlatt);
  for (const m of mitarbeiter) {
    const eigene = urlaub.filter((u) => u.benutzerId === m.id && u.status === "genehmigt");
    const werte: Record<string, number | string> = { name: m.name };
    let summe = 0;
    MONATE.forEach((_, i) => {
      const anfang = `${jahr}-${String(i + 1).padStart(2, "0")}-01`;
      const ende = new Date(Date.UTC(jahr, i + 1, 0)).toISOString().slice(0, 10);
      const tage = eigene.reduce((s, u) => {
        if (u.bis < anfang || u.von > ende) return s;
        const von = u.von < anfang ? anfang : u.von;
        const bis = u.bis > ende ? ende : u.bis;
        return s + arbeitstage({ von, bis, halbtags: u.halbtags }, land);
      }, 0);
      werte[`m${i}`] = tage;
      summe += tage;
    });
    werte.summe = summe;
    monatsBlatt.addRow(werte).getCell("summe").font = { bold: true };
  }

  // 3. Alle Abwesenheiten
  const listenBlatt = mappe.addWorksheet(`Abwesenheiten ${jahr}`, { views: [{ state: "frozen", ySplit: 1 }] });
  listenBlatt.columns = [
    { header: "Mitarbeiter", key: "name", width: 24 },
    { header: "Art", key: "art", width: 14 },
    { header: "Von", key: "von", width: 12, style: { numFmt: "dd.mm.yyyy" } },
    { header: "Bis", key: "bis", width: 12, style: { numFmt: "dd.mm.yyyy" } },
    { header: `Arbeitstage ${jahr}`, key: "tage", width: 16, style: { numFmt: TAGE_FORMAT } },
    { header: "Halber Tag", key: "halb", width: 11 },
    { header: "Status", key: "status", width: 12 },
  ];
  kopfzeile(listenBlatt);
  const sortiert = [...abwesenheiten].sort((a, b) => a.name.localeCompare(b.name, "de") || a.von.localeCompare(b.von));
  for (const a of sortiert) {
    listenBlatt.addRow({
      name: a.name,
      art: a.art ? ARTEN[a.art].name : "abwesend",
      von: alsDatum(a.von),
      bis: alsDatum(a.bis),
      tage: arbeitstage(a, land, jahr),
      halb: a.halbtags ? "ja" : "",
      status: STATUS[a.status].text,
    });
  }
  listenBlatt.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: listenBlatt.columns.length } };

  return new Uint8Array(await mappe.xlsx.writeBuffer());
}
