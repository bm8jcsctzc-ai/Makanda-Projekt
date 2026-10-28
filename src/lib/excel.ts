import ExcelJS from "exceljs";
import { formatMonat } from "./format";
import { ANLAGENTYPEN } from "./technik";
import type { WartungsZeile } from "./typen";
import { monatsLast, naechsteMonate, wartungsStatus } from "./wartungsplan";

const STATUS_TEXT = { ueberfaellig: "überfällig", bald: "bald fällig", spaeter: "", ohne: "kein Termin" };

/** Datum "YYYY-MM-DD" als echtes Excel-Datum (ohne Zeitzonen-Verschiebung) */
const alsDatum = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00Z`) : null);

/** Excel-Datei mit allen Wartungskunden (eine Zeile pro Anlage) und einer Monatsübersicht */
export async function wartungsExcel(zeilen: WartungsZeile[], heute: string, vorlaufMonate: number, grenze: number | null): Promise<Uint8Array> {
  const mappe = new ExcelJS.Workbook();
  mappe.creator = "Makanda";
  mappe.created = new Date();

  const blatt = mappe.addWorksheet("Wartungskunden", { views: [{ state: "frozen", ySplit: 1 }] });
  blatt.columns = [
    { header: "Nächste Wartung", key: "naechste", width: 16, style: { numFmt: "dd.mm.yyyy" } },
    { header: "Status", key: "status", width: 13 },
    { header: "Termin geplant", key: "geplant", width: 15, style: { numFmt: "dd.mm.yyyy" } },
    { header: "Erinnert am", key: "erinnert", width: 13, style: { numFmt: "dd.mm.yyyy" } },
    { header: "Kunde", key: "kunde", width: 28 },
    { header: "Ansprechpartner", key: "ansprechpartner", width: 20 },
    { header: "Straße", key: "strasse", width: 26 },
    { header: "PLZ", key: "plz", width: 8 },
    { header: "Ort", key: "ort", width: 18 },
    { header: "Telefon", key: "telefon", width: 18 },
    { header: "E-Mail", key: "email", width: 26 },
    { header: "TAIFUN-Nr.", key: "taifun", width: 12 },
    { header: "Anlage", key: "art", width: 16 },
    { header: "Hersteller", key: "hersteller", width: 16 },
    { header: "Modell", key: "modell", width: 20 },
    { header: "Seriennummer", key: "seriennummer", width: 16 },
    { header: "Baujahr", key: "baujahr", width: 9 },
    { header: "Aufstellort", key: "aufstellort", width: 20 },
    { header: "Intervall (Monate)", key: "intervall", width: 10 },
    { header: "Letzte Wartung", key: "letzte", width: 15, style: { numFmt: "dd.mm.yyyy" } },
  ];
  blatt.getRow(1).font = { bold: true };
  blatt.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

  for (const { a, k, geplantAm, erinnertAm } of zeilen) {
    const status = wartungsStatus(a.naechsteWartungAm, heute, vorlaufMonate);
    const zeile = blatt.addRow({
      naechste: alsDatum(a.naechsteWartungAm),
      status: STATUS_TEXT[status],
      geplant: alsDatum(geplantAm),
      erinnert: erinnertAm,
      kunde: k.name,
      ansprechpartner: k.ansprechpartner,
      strasse: k.strasse,
      plz: k.plz,
      ort: k.ort,
      telefon: k.telefon,
      email: k.email,
      taifun: k.taifunKundennr,
      art: ANLAGENTYPEN[a.typ],
      hersteller: a.hersteller,
      modell: a.modell,
      seriennummer: a.seriennummer,
      baujahr: a.baujahr,
      aufstellort: a.aufstellort,
      intervall: a.wartungsintervallMonate,
      letzte: alsDatum(a.letzteWartungAm),
    });
    if (status === "ueberfaellig") zeile.getCell("status").font = { bold: true, color: { argb: "FFB91C1C" } };
  }
  blatt.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: blatt.columns.length } };

  const monate = naechsteMonate(heute.slice(0, 7), 12);
  const last = monatsLast(
    zeilen.map((z) => z.a.naechsteWartungAm).filter((d): d is string => !!d),
    monate,
    grenze,
  );
  const uebersicht = mappe.addWorksheet("Monatsübersicht");
  uebersicht.columns = [
    { header: "Monat", key: "monat", width: 18 },
    { header: "Wartungen", key: "anzahl", width: 12 },
    { header: "Hinweis", key: "hinweis", width: 60 },
  ];
  uebersicht.getRow(1).font = { bold: true };
  for (const m of last.monate) {
    const zeile = uebersicht.addRow({
      monat: formatMonat(m.monat),
      anzahl: m.anzahl,
      hinweis: m.auffaellig ? `Viele Wartungen (${m.grund})` : "",
    });
    if (m.auffaellig) zeile.font = { bold: true, color: { argb: "FFB45309" } };
  }
  uebersicht.addRow({});
  uebersicht.addRow({ monat: "Überfällige Wartungen zählen in den aktuellen Monat." });

  return new Uint8Array(await mappe.xlsx.writeBuffer());
}
