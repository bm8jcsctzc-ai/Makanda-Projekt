"use client";

import { useFormular } from "@/lib/useFormular";
import Link from "next/link";
import type { Personalkosten } from "@/db/schema";
import type { FormularZustand } from "@/lib/aktionen";
import { centAlsEingabe } from "@/lib/format";

type Props = {
  aktion: (zustand: FormularZustand, form: FormData) => Promise<FormularZustand>;
  eintrag?: Personalkosten;
  mitarbeiterVorschlaege: string[];
  heute: string;
};

export function GehaltsFormular({ aktion, eintrag: p, mitarbeiterVorschlaege, heute }: Props) {
  const { zustand, laeuft, formularProps } = useFormular(aktion);
  return (
    <form {...formularProps} className="karte grid gap-4 sm:grid-cols-2">
      {zustand?.fehler && <p className="fehler-box sm:col-span-2">{zustand.fehler}</p>}
      <div>
        <label className="feld-label" htmlFor="mitarbeiter">Mitarbeiter *</label>
        <input className="eingabe" id="mitarbeiter" name="mitarbeiter" list="mitarbeiter-liste" defaultValue={p?.mitarbeiter} required />
        <datalist id="mitarbeiter-liste">
          {mitarbeiterVorschlaege.map((m) => <option key={m} value={m} />)}
        </datalist>
      </div>
      <div>
        <label className="feld-label" htmlFor="funktion">Funktion</label>
        <input className="eingabe" id="funktion" name="funktion" placeholder="z. B. Anlagenmechaniker, Azubi, Minijob" defaultValue={p?.funktion ?? ""} />
      </div>
      <div>
        <label className="feld-label" htmlFor="brutto">Bruttogehalt pro Monat (€) *</label>
        <input className="eingabe" id="brutto" name="brutto" inputMode="decimal" defaultValue={centAlsEingabe(p?.bruttoCent)} required />
      </div>
      <div>
        <label className="feld-label" htmlFor="arbeitgeberanteil">Arbeitgeberanteile pro Monat (€)</label>
        <input className="eingabe" id="arbeitgeberanteil" name="arbeitgeberanteil" inputMode="decimal" defaultValue={centAlsEingabe(p?.arbeitgeberanteilCent)} />
        <p className="mt-1 text-xs text-slate-500">Sozialversicherung, Umlagen, Berufsgenossenschaft – steht auf der Lohnabrechnung vom Steuerberater.</p>
      </div>
      <div>
        <label className="feld-label" htmlFor="gueltigAb">Gültig ab *</label>
        <input className="eingabe" id="gueltigAb" name="gueltigAb" type="date" defaultValue={p?.gueltigAb ?? heute} required />
      </div>
      <div>
        <label className="feld-label" htmlFor="gueltigBis">Gültig bis (optional)</label>
        <input className="eingabe" id="gueltigBis" name="gueltigBis" type="date" defaultValue={p?.gueltigBis ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="feld-label" htmlFor="notiz">Notiz</label>
        <textarea className="eingabe" id="notiz" name="notiz" rows={2} defaultValue={p?.notiz ?? ""} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primaer" disabled={laeuft}>{laeuft ? "Speichern …" : "Speichern"}</button>
        <Link className="btn" href="/finanzen/gehaelter/">Abbrechen</Link>
      </div>
    </form>
  );
}
