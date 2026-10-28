"use client";

import Link from "next/link";
import type { Kunde } from "@/db/schema";
import type { FormularZustand } from "@/lib/aktionen";
import { useFormular } from "@/lib/useFormular";

type Props = {
  aktion: (zustand: FormularZustand, form: FormData) => Promise<FormularZustand>;
  kunde?: Kunde;
  zurueck: string;
};

export function KundenFormular({ aktion, kunde: k, zurueck }: Props) {
  const { zustand, laeuft, formularProps } = useFormular(aktion);
  return (
    <form {...formularProps} className="karte grid gap-4 sm:grid-cols-2">
      {zustand?.fehler && <p className="fehler-box sm:col-span-2">{zustand.fehler}</p>}
      <div className="sm:col-span-2">
        <label className="feld-label" htmlFor="name">Name / Firma *</label>
        <input className="eingabe" id="name" name="name" defaultValue={k?.name} required />
      </div>
      <div>
        <label className="feld-label" htmlFor="ansprechpartner">Ansprechpartner</label>
        <input className="eingabe" id="ansprechpartner" name="ansprechpartner" defaultValue={k?.ansprechpartner ?? ""} />
      </div>
      <div>
        <label className="feld-label" htmlFor="taifunKundennr">TAIFUN-Kundennummer</label>
        <input className="eingabe" id="taifunKundennr" name="taifunKundennr" defaultValue={k?.taifunKundennr ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="feld-label" htmlFor="strasse">Straße und Hausnummer</label>
        <input className="eingabe" id="strasse" name="strasse" autoComplete="street-address" defaultValue={k?.strasse ?? ""} />
      </div>
      <div className="grid grid-cols-[7rem_1fr] gap-3 sm:col-span-2">
        <div>
          <label className="feld-label" htmlFor="plz">PLZ</label>
          <input className="eingabe" id="plz" name="plz" inputMode="numeric" defaultValue={k?.plz ?? ""} />
        </div>
        <div>
          <label className="feld-label" htmlFor="ort">Ort</label>
          <input className="eingabe" id="ort" name="ort" defaultValue={k?.ort ?? ""} />
        </div>
      </div>
      <div>
        <label className="feld-label" htmlFor="telefon">Telefon</label>
        <input className="eingabe" id="telefon" name="telefon" type="tel" defaultValue={k?.telefon ?? ""} />
      </div>
      <div>
        <label className="feld-label" htmlFor="email">E-Mail</label>
        <input className="eingabe" id="email" name="email" type="email" defaultValue={k?.email ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="feld-label" htmlFor="hinweise">Hinweise für die Monteure</label>
        <textarea className="eingabe" id="hinweise" name="hinweise" rows={2} placeholder="z. B. Schlüssel beim Nachbarn, Hund im Haus, Heizung im Keller links" defaultValue={k?.hinweise ?? ""} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primaer" disabled={laeuft}>{laeuft ? "Speichern …" : "Speichern"}</button>
        <Link className="btn" href={zurueck}>Abbrechen</Link>
      </div>
    </form>
  );
}
