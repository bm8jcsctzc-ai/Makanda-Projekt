"use client";

import { verkleinern } from "@/lib/bild";
import { dateiOeffnen } from "@/lib/dateien";
import { useFormular } from "@/lib/useFormular";
import Link from "next/link";
import type { Rechnung } from "@/db/schema";
import type { FormularZustand } from "@/lib/aktionen";
import { KATEGORIEN, MWST_SAETZE } from "@/lib/finanzen";
import { centAlsEingabe } from "@/lib/format";

type Props = {
  aktion: (zustand: FormularZustand, form: FormData) => Promise<FormularZustand>;
  rechnung?: Rechnung;
  dateiName?: string | null;
  dateiPfad?: string | null;
  lieferanten: string[];
  heute: string;
};

export function RechnungsFormular({ aktion, rechnung: r, dateiName, dateiPfad, lieferanten, heute }: Props) {
  const { zustand, laeuft, formularProps } = useFormular(aktion, {
    // Handyfotos von Rechnungen verkleinern, damit sie unter der Upload-Grenze bleiben
    vorbereiten: async (daten) => {
      const datei = daten.get("datei");
      if (datei instanceof File && datei.size > 0) daten.set("datei", await verkleinern(datei));
    },
  });
  return (
    <form {...formularProps} className="karte grid gap-4 sm:grid-cols-2">
      {zustand?.fehler && <p className="fehler-box sm:col-span-2">{zustand.fehler}</p>}

      <div className="sm:col-span-2">
        <label className="feld-label" htmlFor="datei">
          Rechnung (PDF oder Foto){r && dateiName ? " – ersetzt die vorhandene Datei" : ""}
        </label>
        <input
          className="eingabe file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1"
          id="datei"
          name="datei"
          type="file"
          accept="application/pdf,image/*"
        />
        {r && dateiName && (
          <p className="mt-1 text-sm text-slate-600">
            Vorhanden:{" "}
            <button type="button" className="text-marke underline" onClick={() => dateiPfad && dateiOeffnen(dateiPfad)}>
              {dateiName}
            </button>
          </p>
        )}
      </div>

      <div>
        <label className="feld-label" htmlFor="lieferant">Lieferant *</label>
        <input className="eingabe" id="lieferant" name="lieferant" list="lieferanten" defaultValue={r?.lieferant} required />
        <datalist id="lieferanten">
          {lieferanten.map((l) => <option key={l} value={l} />)}
        </datalist>
      </div>
      <div>
        <label className="feld-label" htmlFor="rechnungsnummer">Rechnungsnummer</label>
        <input className="eingabe" id="rechnungsnummer" name="rechnungsnummer" defaultValue={r?.rechnungsnummer ?? ""} />
      </div>

      <div>
        <label className="feld-label" htmlFor="rechnungsdatum">Rechnungsdatum *</label>
        <input className="eingabe" id="rechnungsdatum" name="rechnungsdatum" type="date" defaultValue={r?.rechnungsdatum ?? heute} required />
      </div>
      <div>
        <label className="feld-label" htmlFor="faelligAm">Fällig am</label>
        <input className="eingabe" id="faelligAm" name="faelligAm" type="date" defaultValue={r?.faelligAm ?? ""} />
      </div>

      <div>
        <label className="feld-label" htmlFor="brutto">Betrag brutto (€) *</label>
        <input className="eingabe" id="brutto" name="brutto" inputMode="decimal" placeholder="z. B. 1.234,56" defaultValue={centAlsEingabe(r?.bruttoCent)} required />
      </div>
      <div>
        <label className="feld-label" htmlFor="mwstSatz">MwSt-Satz</label>
        <select className="eingabe" id="mwstSatz" name="mwstSatz" defaultValue={r?.mwstSatz ?? 19}>
          {MWST_SAETZE.map((s) => <option key={s} value={s}>{s} %</option>)}
        </select>
      </div>

      <div>
        <label className="feld-label" htmlFor="kategorie">Kategorie *</label>
        <select className="eingabe" id="kategorie" name="kategorie" defaultValue={r?.kategorie ?? ""} required>
          <option value="" disabled>Bitte wählen …</option>
          {KATEGORIEN.map((k) => <option key={k}>{k}</option>)}
        </select>
      </div>
      <div>
        <label className="feld-label" htmlFor="bezahltAm">Bezahlt am (leer = noch offen)</label>
        <input className="eingabe" id="bezahltAm" name="bezahltAm" type="date" defaultValue={r?.bezahltAm ?? ""} />
      </div>

      <div className="sm:col-span-2">
        <label className="feld-label" htmlFor="notiz">Notiz</label>
        <textarea className="eingabe" id="notiz" name="notiz" rows={2} defaultValue={r?.notiz ?? ""} />
      </div>

      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primaer" disabled={laeuft}>{laeuft ? "Speichern …" : "Speichern"}</button>
        <Link className="btn" href="/finanzen/rechnungen/">Abbrechen</Link>
      </div>
    </form>
  );
}
