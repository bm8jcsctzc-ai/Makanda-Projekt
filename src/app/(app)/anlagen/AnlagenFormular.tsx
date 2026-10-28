"use client";

import Link from "next/link";
import { useState } from "react";
import type { Anlage, Anlagentyp } from "@/db/schema";
import type { FormularZustand } from "@/lib/aktionen";
import { ANLAGENTYPEN } from "@/lib/technik";
import { useFormular } from "@/lib/useFormular";

type Props = {
  aktion: (zustand: FormularZustand, form: FormData) => Promise<FormularZustand>;
  anlage?: Anlage;
  zurueck: string;
};

function Feld({ id, titel, wert, ...rest }: { id: string; titel: string; wert?: string | number | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="feld-label" htmlFor={id}>{titel}</label>
      <input className="eingabe" id={id} name={id} defaultValue={wert ?? ""} {...rest} />
    </div>
  );
}

export function AnlagenFormular({ aktion, anlage: a, zurueck }: Props) {
  const { zustand, laeuft, formularProps } = useFormular(aktion);
  const [typ, setTyp] = useState<Anlagentyp | "">(a?.typ ?? "");
  const mitKaeltemittel = typ === "klima" || typ === "waermepumpe";
  return (
    <form {...formularProps} className="karte grid gap-4 sm:grid-cols-2">
      {zustand?.fehler && <p className="fehler-box sm:col-span-2">{zustand.fehler}</p>}
      <div>
        <label className="feld-label" htmlFor="typ">Art der Anlage *</label>
        <select className="eingabe" id="typ" name="typ" value={typ} onChange={(e) => setTyp(e.target.value as Anlagentyp)} required>
          <option value="" disabled>Bitte wählen …</option>
          {Object.entries(ANLAGENTYPEN).map(([wert, name]) => <option key={wert} value={wert}>{name}</option>)}
        </select>
      </div>
      <Feld id="bezeichnung" titel="Bezeichnung (optional)" wert={a?.bezeichnung} placeholder="z. B. Therme Dachgeschoss" />
      <Feld id="hersteller" titel="Hersteller" wert={a?.hersteller} placeholder="z. B. Viessmann, Vaillant, Buderus" />
      <Feld id="modell" titel="Modell / Typ" wert={a?.modell} />
      <Feld id="seriennummer" titel="Seriennummer" wert={a?.seriennummer} />
      <div className="grid grid-cols-2 gap-3">
        <Feld id="baujahr" titel="Baujahr" wert={a?.baujahr} inputMode="numeric" />
        <Feld id="leistungKw" titel="Leistung (kW)" wert={a?.leistungKw} inputMode="decimal" />
      </div>
      {mitKaeltemittel && (
        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <Feld id="kaeltemittel" titel="Kältemittel" wert={a?.kaeltemittel} placeholder="z. B. R32, R290" />
          <Feld id="kaeltemittelKg" titel="Füllmenge (kg)" wert={a?.kaeltemittelKg} inputMode="decimal" />
        </div>
      )}
      <div className="sm:col-span-2">
        <Feld id="aufstellort" titel="Aufstellort" wert={a?.aufstellort} placeholder="z. B. Keller, Heizraum links" />
      </div>

      <fieldset className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:col-span-2 sm:grid-cols-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Wartung</legend>
        <Feld id="wartungsintervallMonate" titel="Intervall (Monate)" wert={a?.wartungsintervallMonate ?? 12} type="number" min={1} max={60} />
        <Feld id="letzteWartungAm" titel="Letzte Wartung" wert={a?.letzteWartungAm} type="date" />
        <div>
          <Feld id="naechsteWartungAm" titel="Nächste Wartung" wert={a?.naechsteWartungAm} type="date" />
          <p className="mt-1 text-xs text-slate-500">Leer lassen = wird aus letzter Wartung + Intervall berechnet</p>
        </div>
      </fieldset>

      <div className="sm:col-span-2">
        <label className="feld-label" htmlFor="notiz">Notiz</label>
        <textarea className="eingabe" id="notiz" name="notiz" rows={2} defaultValue={a?.notiz ?? ""} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primaer" disabled={laeuft}>{laeuft ? "Speichern …" : "Speichern"}</button>
        <Link className="btn" href={zurueck}>Abbrechen</Link>
      </div>
    </form>
  );
}
