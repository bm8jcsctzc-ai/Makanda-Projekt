"use client";

import Link from "next/link";
import { useState } from "react";
import type { Einsatz } from "@/db/schema";
import type { FormularZustand } from "@/lib/aktionen";
import { EINSATZARTEN } from "@/lib/technik";
import { useFormular } from "@/lib/useFormular";

type Auswahl = { id: string; name: string };

type Props = {
  aktion: (zustand: FormularZustand, form: FormData) => Promise<FormularZustand>;
  einsatz?: Einsatz;
  vorauswahl?: { kundeId?: string; anlageId?: string; datum?: string };
  kunden: Auswahl[];
  anlagen: (Auswahl & { kundeId: string })[];
  mitarbeiter: Auswahl[];
  abwesenheiten: { benutzerId: string; von: string; bis: string; status: string }[];
  heute: string;
  zurueck: string;
};

export function EinsatzFormular({ aktion, einsatz: e, vorauswahl, kunden, anlagen, mitarbeiter, abwesenheiten, heute, zurueck }: Props) {
  const { zustand, laeuft, formularProps } = useFormular(aktion);
  const [kundeId, setKundeId] = useState(e?.kundeId ?? vorauswahl?.kundeId ?? "");
  const [anlageId, setAnlageId] = useState(e?.anlageId ?? vorauswahl?.anlageId ?? "");
  const anlagenDesKunden = anlagen.filter((a) => a.kundeId === kundeId);
  const [monteurId, setMonteurId] = useState(e?.monteurId ?? "");
  const [datum, setDatum] = useState(e?.datum ?? vorauswahl?.datum ?? heute);
  const abwesend = abwesenheiten.find((a) => a.benutzerId === monteurId && a.von <= datum && a.bis >= datum);

  return (
    <form {...formularProps} className="karte grid gap-4 sm:grid-cols-2">
      {zustand?.fehler && <p className="fehler-box sm:col-span-2">{zustand.fehler}</p>}
      <div>
        <label className="feld-label" htmlFor="kundeId">Kunde *</label>
        <select
          className="eingabe"
          id="kundeId"
          name="kundeId"
          value={kundeId}
          onChange={(ev) => {
            setKundeId(ev.target.value);
            setAnlageId("");
          }}
          required
        >
          <option value="" disabled>Bitte wählen …</option>
          {kunden.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
      </div>
      <div>
        <label className="feld-label" htmlFor="anlageId">Anlage</label>
        <select className="eingabe" id="anlageId" name="anlageId" value={anlageId} onChange={(ev) => setAnlageId(ev.target.value)} disabled={!kundeId}>
          <option value="">{anlagenDesKunden.length ? "– keine bestimmte –" : "– keine Anlage erfasst –"}</option>
          {anlagenDesKunden.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div>
        <label className="feld-label" htmlFor="art">Art *</label>
        <select className="eingabe" id="art" name="art" defaultValue={e?.art ?? "wartung"}>
          {Object.entries(EINSATZARTEN).map(([wert, name]) => <option key={wert} value={wert}>{name}</option>)}
        </select>
      </div>
      <div>
        <label className="feld-label" htmlFor="monteurId">Monteur</label>
        <select className="eingabe" id="monteurId" name="monteurId" value={monteurId} onChange={(ev) => setMonteurId(ev.target.value)}>
          <option value="">– noch offen –</option>
          {mitarbeiter.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:col-span-2">
        <div>
          <label className="feld-label" htmlFor="datum">Datum *</label>
          <input className="eingabe" id="datum" name="datum" type="date" value={datum} onChange={(ev) => setDatum(ev.target.value)} required />
        </div>
        <div>
          <label className="feld-label" htmlFor="uhrzeit">Uhrzeit</label>
          <input className="eingabe" id="uhrzeit" name="uhrzeit" type="time" defaultValue={e?.uhrzeit ?? ""} />
        </div>
      </div>
      {abwesend && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-2">
          ⚠ {mitarbeiter.find((m) => m.id === monteurId)?.name} ist an diesem Tag abwesend
          {abwesend.status === "beantragt" ? " (Urlaub beantragt)" : ""}.
        </p>
      )}
      <div className="sm:col-span-2">
        <label className="feld-label" htmlFor="beschreibung">Was ist zu tun?</label>
        <textarea className="eingabe" id="beschreibung" name="beschreibung" rows={3} placeholder="z. B. Jahreswartung, Kunde meldet Geräusche an der Pumpe" defaultValue={e?.beschreibung ?? ""} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primaer" disabled={laeuft}>{laeuft ? "Speichern …" : "Speichern"}</button>
        <Link className="btn" href={zurueck}>Abbrechen</Link>
      </div>
    </form>
  );
}
