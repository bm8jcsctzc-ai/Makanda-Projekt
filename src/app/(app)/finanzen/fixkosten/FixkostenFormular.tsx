"use client";

import { useFormular } from "@/lib/useFormular";
import Link from "next/link";
import type { Fixkosten } from "@/db/schema";
import type { FormularZustand } from "@/lib/aktionen";
import { INTERVALLE, KATEGORIEN } from "@/lib/finanzen";
import { centAlsEingabe } from "@/lib/format";

type Props = {
  aktion: (zustand: FormularZustand, form: FormData) => Promise<FormularZustand>;
  eintrag?: Fixkosten;
  heute: string;
};

export function FixkostenFormular({ aktion, eintrag: f, heute }: Props) {
  const { zustand, laeuft, formularProps } = useFormular(aktion);
  return (
    <form {...formularProps} className="karte grid gap-4 sm:grid-cols-2">
      {zustand?.fehler && <p className="fehler-box sm:col-span-2">{zustand.fehler}</p>}
      <div className="sm:col-span-2">
        <label className="feld-label" htmlFor="bezeichnung">Bezeichnung *</label>
        <input className="eingabe" id="bezeichnung" name="bezeichnung" placeholder="z. B. Leasing Transporter, Werkstattmiete" defaultValue={f?.bezeichnung} required />
      </div>
      <div>
        <label className="feld-label" htmlFor="betrag">Betrag (€) *</label>
        <input className="eingabe" id="betrag" name="betrag" inputMode="decimal" placeholder="z. B. 450,00" defaultValue={centAlsEingabe(f?.betragCent)} required />
      </div>
      <div>
        <label className="feld-label" htmlFor="intervall">Wird bezahlt *</label>
        <select className="eingabe" id="intervall" name="intervall" defaultValue={f?.intervall ?? "monatlich"}>
          {Object.entries(INTERVALLE).map(([wert, { name }]) => <option key={wert} value={wert}>{name}</option>)}
        </select>
      </div>
      <div>
        <label className="feld-label" htmlFor="kategorie">Kategorie *</label>
        <select className="eingabe" id="kategorie" name="kategorie" defaultValue={f?.kategorie ?? ""} required>
          <option value="" disabled>Bitte wählen …</option>
          {KATEGORIEN.map((k) => <option key={k}>{k}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="feld-label" htmlFor="beginn">Seit *</label>
          <input className="eingabe" id="beginn" name="beginn" type="date" defaultValue={f?.beginn ?? heute} required />
        </div>
        <div>
          <label className="feld-label" htmlFor="ende">Bis (optional)</label>
          <input className="eingabe" id="ende" name="ende" type="date" defaultValue={f?.ende ?? ""} />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="feld-label" htmlFor="notiz">Notiz</label>
        <textarea className="eingabe" id="notiz" name="notiz" rows={2} placeholder="z. B. Vertragsnummer, Kündigungsfrist" defaultValue={f?.notiz ?? ""} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primaer" disabled={laeuft}>{laeuft ? "Speichern …" : "Speichern"}</button>
        <Link className="btn" href="/finanzen/fixkosten/">Abbrechen</Link>
      </div>
    </form>
  );
}
