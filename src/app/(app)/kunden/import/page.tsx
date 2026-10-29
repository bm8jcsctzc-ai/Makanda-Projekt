"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Seitenkopf } from "@/components/Seitenkopf";
import { api, fehlertext } from "@/lib/api";
import { FELDER, kundenAusZeilen, spaltenErkennen, tabelleLesen, type Feld, type Zuordnung } from "@/lib/kunden-import";
import { useBenoetige } from "@/lib/sitzung";
import { DARF_PLANEN } from "@/lib/technik";

const PAKET = 500;

export default function KundenImport() {
  const b = useBenoetige(DARF_PLANEN);
  const [datei, setDatei] = useState<{ name: string; kopf: string[]; zeilen: string[][] }>();
  const [zuordnung, setZuordnung] = useState<Zuordnung>();
  const [fehler, setFehler] = useState<string>();
  const [laeuft, setLaeuft] = useState(false);
  const [fortschritt, setFortschritt] = useState(0);
  const [ergebnis, setErgebnis] = useState<{ neu: number; aktualisiert: number }>();

  const auswertung = useMemo(() => (datei && zuordnung ? kundenAusZeilen(datei.zeilen, zuordnung) : undefined), [datei, zuordnung]);

  if (!b) return null;

  async function dateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFehler(undefined);
    setErgebnis(undefined);
    setDatei(undefined);
    if (!f) return;
    try {
      const t = await tabelleLesen(f);
      setDatei({ name: f.name, ...t });
      setZuordnung(spaltenErkennen(t.kopf));
    } catch (err) {
      setFehler(fehlertext(err));
    }
  }

  async function importieren() {
    if (!auswertung) return;
    setLaeuft(true);
    setFehler(undefined);
    const summe = { neu: 0, aktualisiert: 0 };
    try {
      for (let i = 0; i < auswertung.kunden.length; i += PAKET) {
        const r = await api<{ neu: number; aktualisiert: number }>("kunden_importieren", { p_kunden: auswertung.kunden.slice(i, i + PAKET) });
        summe.neu += r.neu;
        summe.aktualisiert += r.aktualisiert;
        setFortschritt(Math.min(i + PAKET, auswertung.kunden.length));
      }
      setErgebnis(summe);
      setDatei(undefined);
    } catch (err) {
      setFehler(`${fehlertext(err)} (${summe.neu + summe.aktualisiert} Kunden waren schon übernommen. Ein neuer Versuch legt keine doppelt an.)`);
    }
    setLaeuft(false);
  }

  return (
    <>
      <Seitenkopf titel="Kunden aus TAIFUN importieren" untertitel="Excel-Datei (.xlsx) oder CSV mit der Kundenliste aus TAIFUN hochladen." />

      {ergebnis && (
        <div className="karte mb-4 space-y-2 border-green-200 bg-green-50">
          <p className="font-medium text-green-900">
            Fertig: {ergebnis.neu} {ergebnis.neu === 1 ? "Kunde" : "Kunden"} neu angelegt, {ergebnis.aktualisiert} aktualisiert.
          </p>
          <Link className="btn" href="/kunden/">Zur Kundenliste</Link>
        </div>
      )}

      <div className="karte mb-4 space-y-3">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>In TAIFUN die Kundenliste als Excel oder CSV exportieren. Die erste Zeile muss die Spaltenüberschriften enthalten.</li>
          <li>Datei hier auswählen und die Vorschau prüfen.</li>
          <li>
            Später einfach wieder importieren: Kunden mit derselben TAIFUN-Kundennummer werden aktualisiert statt doppelt angelegt.
            Leere Felder überschreiben nichts, Hinweise und Anlagen bleiben erhalten.
          </li>
        </ol>
        <input className="eingabe" type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={dateiGewaehlt} disabled={laeuft} aria-label="Datei auswählen" />
        {fehler && <p className="fehler-box">{fehler}</p>}
      </div>

      {datei && zuordnung && auswertung && (
        <>
          <section className="karte mb-4">
            <h2 className="mb-1 font-semibold">Spalten zuordnen</h2>
            <p className="mb-3 text-sm text-slate-600">
              Die App hat die Spalten aus „{datei.name}“ anhand der Überschriften zugeordnet. Stimmt etwas nicht, hier umstellen.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(FELDER) as Feld[]).map((feld) => (
                <div key={feld}>
                  <label className="feld-label" htmlFor={`feld-${feld}`}>{FELDER[feld].titel}</label>
                  <select
                    className="eingabe"
                    id={`feld-${feld}`}
                    value={zuordnung[feld]}
                    onChange={(e) => setZuordnung({ ...zuordnung, [feld]: Number(e.target.value) })}
                  >
                    <option value={-1}>– nicht übernehmen –</option>
                    {datei.kopf.map((k, i) => <option key={i} value={i}>{k || `Spalte ${i + 1}`}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>

          <section className="karte mb-4">
            <h2 className="mb-1 font-semibold">Vorschau</h2>
            <p className="mb-3 text-sm text-slate-600">
              <strong>{auswertung.kunden.length} Kunden</strong> erkannt
              {auswertung.ohneName > 0 && `, ${auswertung.ohneName} ${auswertung.ohneName === 1 ? "Zeile" : "Zeilen"} ohne Namen ${auswertung.ohneName === 1 ? "wird" : "werden"} übersprungen`}
              {auswertung.ungueltigeEmail > 0 && `, bei ${auswertung.ungueltigeEmail} ist die E-Mail-Adresse ungültig und bleibt leer`}.
            </p>
            {zuordnung.name < 0 && <p className="fehler-box mb-3">Bitte zuerst die Spalte für „Name / Firma“ auswählen.</p>}
            <div className="overflow-x-auto">
              <table className="tabelle">
                <thead>
                  <tr>
                    <th>Kd.-Nr.</th>
                    <th>Name</th>
                    <th>Adresse</th>
                    <th className="hidden md:table-cell">Telefon</th>
                    <th className="hidden md:table-cell">E-Mail</th>
                  </tr>
                </thead>
                <tbody>
                  {auswertung.kunden.slice(0, 10).map((k, i) => (
                    <tr key={i}>
                      <td>{k.taifun_kundennr}</td>
                      <td>
                        {k.name}
                        {k.ansprechpartner && <div className="text-xs text-slate-500">{k.ansprechpartner}</div>}
                      </td>
                      <td>{[k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</td>
                      <td className="hidden md:table-cell">{k.telefon}</td>
                      <td className="hidden md:table-cell">{k.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {auswertung.kunden.length > 10 && <p className="mt-2 text-sm text-slate-500">… und {auswertung.kunden.length - 10} weitere</p>}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primaer" onClick={importieren} disabled={laeuft || zuordnung.name < 0 || auswertung.kunden.length === 0}>
              {laeuft ? `Importiere … ${fortschritt} von ${auswertung.kunden.length}` : `${auswertung.kunden.length} Kunden importieren`}
            </button>
            <Link className="btn" href="/kunden/">Abbrechen</Link>
          </div>
        </>
      )}
    </>
  );
}
