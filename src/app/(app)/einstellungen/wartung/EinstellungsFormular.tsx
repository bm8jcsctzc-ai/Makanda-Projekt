"use client";

import { useState } from "react";
import type { Einstellungen } from "@/db/schema";
import type { FormularZustand } from "@/lib/aktionen";
import { BUNDESLAENDER } from "@/lib/feiertage";
import { useFormular } from "@/lib/useFormular";
import { fuelleText, PLATZHALTER, STANDARD_BETREFF, STANDARD_TEXT } from "@/lib/wartungsplan";

type Props = { aktion: (z: FormularZustand, f: FormData) => Promise<FormularZustand>; werte: Einstellungen };

export function EinstellungsFormular({ aktion, werte: w }: Props) {
  const { zustand, laeuft, formularProps } = useFormular(aktion);
  const [firma, setFirma] = useState(w.firmenname);
  const [telefon, setTelefon] = useState(w.firmaTelefon ?? "");
  const [betreff, setBetreff] = useState(w.erinnerungBetreff);
  const [mailText, setMailText] = useState(w.erinnerungText);
  const beispiel = { kunde: "Familie Schmidt", anlage: "Gasheizung", faellig: "15.01.2027", firma: firma || "Ihr Betrieb", telefon };

  return (
    <form {...formularProps} className="space-y-4">
      <section className="karte grid gap-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Betrieb</h2>
        <div>
          <label className="feld-label" htmlFor="firmenname">Firmenname (Unterschrift in E-Mails)</label>
          <input className="eingabe" id="firmenname" name="firmenname" value={firma} onChange={(e) => setFirma(e.target.value)} />
        </div>
        <div>
          <label className="feld-label" htmlFor="firmaTelefon">Telefon für Kunden</label>
          <input className="eingabe" id="firmaTelefon" name="firmaTelefon" type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
        </div>
        <div>
          <label className="feld-label" htmlFor="bundesland">Bundesland (für Feiertage im Urlaubsplaner)</label>
          <select className="eingabe" id="bundesland" name="bundesland" defaultValue={w.bundesland ?? ""}>
            <option value="">– bitte wählen –</option>
            {Object.entries(BUNDESLAENDER).map(([kuerzel, name]) => <option key={kuerzel} value={kuerzel}>{name}</option>)}
          </select>
        </div>
        <div>
          <label className="feld-label" htmlFor="bueroEmail">Büro-E-Mail (bekommt Wochenbericht und Erinnerungs-Übersicht; Kunden antworten hierhin)</label>
          <input className="eingabe" id="bueroEmail" name="bueroEmail" type="email" defaultValue={w.bueroEmail ?? ""} />
        </div>
      </section>

      <section className="karte grid gap-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Wartungsplan</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="wochenberichtAktiv" defaultChecked={w.wochenberichtAktiv} className="size-4" />
          Wochenbericht mit Excel jeden Montag
        </label>
        <div>
          <label className="feld-label" htmlFor="haeufungGrenze">Warnen ab … Wartungen pro Monat (optional)</label>
          <input className="eingabe" id="haeufungGrenze" name="haeufungGrenze" type="number" min={1} defaultValue={w.haeufungGrenze ?? ""} />
          <p className="mt-1 text-xs text-slate-500">Ohne Angabe warnt die App, wenn ein Monat mind. 50 % über dem Durchschnitt liegt.</p>
        </div>
      </section>

      <section className="karte grid gap-4">
        <h2 className="font-semibold">Erinnerung an Kunden</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="erinnerungenAktiv" defaultChecked={w.erinnerungenAktiv} className="size-4" />
            Kunden automatisch per E-Mail erinnern
          </label>
          <div>
            <label className="feld-label" htmlFor="erinnerungVorlaufMonate">So viele Monate vor der Wartung</label>
            <input className="eingabe" id="erinnerungVorlaufMonate" name="erinnerungVorlaufMonate" type="number" min={1} max={12} defaultValue={w.erinnerungVorlaufMonate} />
          </div>
        </div>
        <div>
          <label className="feld-label" htmlFor="erinnerungBetreff">Betreff</label>
          <input className="eingabe" id="erinnerungBetreff" name="erinnerungBetreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} />
        </div>
        <div>
          <label className="feld-label" htmlFor="erinnerungText">Text</label>
          <textarea className="eingabe font-mono text-sm" id="erinnerungText" name="erinnerungText" rows={10} value={mailText} onChange={(e) => setMailText(e.target.value)} />
          <p className="mt-1 text-xs text-slate-500">
            Platzhalter: {PLATZHALTER.join(" ")} ·{" "}
            <button type="button" className="text-marke underline" onClick={() => { setBetreff(STANDARD_BETREFF); setMailText(STANDARD_TEXT); }}>
              Standardtext wiederherstellen
            </button>
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Vorschau</p>
          <p className="font-medium">{fuelleText(betreff, beispiel)}</p>
          <p className="mt-2 whitespace-pre-line text-slate-700">{fuelleText(mailText, beispiel)}</p>
        </div>
      </section>

      {zustand?.fehler && <p className="fehler-box">{zustand.fehler}</p>}
      {zustand?.erfolg && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{zustand.erfolg}</p>}
      <button className="btn-primaer" disabled={laeuft}>{laeuft ? "Speichern …" : "Speichern"}</button>
    </form>
  );
}
