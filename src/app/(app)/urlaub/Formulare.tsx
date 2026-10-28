"use client";

import Link from "next/link";
import { useState } from "react";
import type { Abwesenheitsart } from "@/db/schema";
import type { FormularZustand } from "@/lib/aktionen";
import type { Bundesland } from "@/lib/feiertage";
import { ARTEN, arbeitstage, formatTage } from "@/lib/urlaub";
import { useFormular } from "@/lib/useFormular";

type Aktion = (z: FormularZustand, f: FormData) => Promise<FormularZustand>;

function Meldung({ zustand }: { zustand: FormularZustand }) {
  if (zustand?.fehler) return <p className="fehler-box">{zustand.fehler}</p>;
  if (zustand?.erfolg) return <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{zustand.erfolg}</p>;
  return null;
}

type FormProps = {
  aktion: Aktion;
  /** Nur Inhaber/Büro: für andere eintragen und Art wählen */
  mitarbeiter: { id: string; name: string }[] | null;
  ichId: string;
  land: Bundesland | null;
  heute: string;
};

export function AbwesenheitFormular({ aktion, mitarbeiter, ichId, land, heute }: FormProps) {
  const { zustand, laeuft, formularProps } = useFormular(aktion);
  const [art, setArt] = useState<Abwesenheitsart>("urlaub");
  const [von, setVon] = useState(heute);
  const [bis, setBis] = useState(heute);
  const [halbtags, setHalbtags] = useState(false);
  const gueltig = /^\d{4}-\d{2}-\d{2}$/.test(von) && /^\d{4}-\d{2}-\d{2}$/.test(bis) && bis >= von;
  const tage = gueltig ? arbeitstage({ von, bis, halbtags: halbtags && von === bis }, land) : null;

  return (
    <form {...formularProps} className="karte grid gap-4 sm:grid-cols-2">
      {mitarbeiter && (
        <>
          <div>
            <label className="feld-label" htmlFor="benutzerId">Mitarbeiter</label>
            <select className="eingabe" id="benutzerId" name="benutzerId" defaultValue={ichId}>
              {mitarbeiter.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="feld-label" htmlFor="art">Art</label>
            <select className="eingabe" id="art" name="art" value={art} onChange={(e) => setArt(e.target.value as Abwesenheitsart)}>
              {Object.entries(ARTEN).map(([wert, a]) => <option key={wert} value={wert}>{a.name}</option>)}
            </select>
          </div>
        </>
      )}
      <div>
        <label className="feld-label" htmlFor="von">Von</label>
        <input
          className="eingabe"
          id="von"
          name="von"
          type="date"
          value={von}
          onChange={(e) => {
            setVon(e.target.value);
            if (e.target.value > bis) setBis(e.target.value);
          }}
          required
        />
      </div>
      <div>
        <label className="feld-label" htmlFor="bis">Bis (einschließlich)</label>
        <input className="eingabe" id="bis" name="bis" type="date" value={bis} min={von} onChange={(e) => setBis(e.target.value)} required />
      </div>
      {von === bis && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="halbtags" className="size-4" checked={halbtags} onChange={(e) => setHalbtags(e.target.checked)} />
          nur ein halber Tag
        </label>
      )}
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm sm:col-span-2" data-testid="arbeitstage">
        {tage == null ? "Bitte Zeitraum prüfen." : (
          <>
            <strong>{formatTage(tage)}</strong> {art === "urlaub" ? "Urlaub" : "Arbeitstage"} (ohne Wochenenden und Feiertage)
          </>
        )}
      </p>
      <div className="sm:col-span-2">
        <label className="feld-label" htmlFor="bemerkung">Bemerkung (optional)</label>
        <input className="eingabe" id="bemerkung" name="bemerkung" />
      </div>
      <div className="sm:col-span-2"><Meldung zustand={zustand} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primaer" disabled={laeuft}>
          {mitarbeiter ? "Eintragen" : "Urlaub beantragen"}
        </button>
        <Link className="btn" href="/urlaub">Abbrechen</Link>
      </div>
    </form>
  );
}

export function EntscheidungFormular({ genehmigen, ablehnen }: { genehmigen: Aktion; ablehnen: Aktion }) {
  const g = useFormular(genehmigen);
  const a = useFormular(ablehnen);
  return (
    <div className="space-y-3">
      <Meldung zustand={g.zustand ?? a.zustand} />
      {!g.zustand?.erfolg && !a.zustand?.erfolg && (
        <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
          <form {...g.formularProps}>
            <button className="btn-primaer w-full bg-green-700 hover:bg-green-800" disabled={g.laeuft || a.laeuft}>✓ Genehmigen</button>
          </form>
          <form {...a.formularProps} className="flex flex-wrap gap-2">
            <input className="eingabe min-w-48 flex-1" name="kommentar" placeholder="Grund für die Ablehnung" aria-label="Grund für die Ablehnung" />
            <button className="btn-gefahr" disabled={g.laeuft || a.laeuft}>Ablehnen</button>
          </form>
        </div>
      )}
    </div>
  );
}

export function KontoFormular({ aktion, anspruch, uebertrag }: { aktion: Aktion; anspruch: number; uebertrag: number }) {
  const { zustand, laeuft, formularProps } = useFormular(aktion);
  return (
    <form {...formularProps} className="flex flex-wrap items-center gap-2">
      <input className="eingabe w-20" name="anspruch" type="number" min={0} max={60} defaultValue={anspruch} aria-label="Anspruch in Tagen" />
      <span className="text-sm text-slate-500">+</span>
      <input className="eingabe w-20" name="uebertrag" inputMode="decimal" defaultValue={String(uebertrag).replace(".", ",")} aria-label="Übertrag aus dem Vorjahr" />
      <button className="btn py-1.5" disabled={laeuft}>Speichern</button>
      {zustand?.fehler && <span className="text-sm text-red-700">{zustand.fehler}</span>}
      {zustand?.erfolg && <span className="text-sm text-green-700">✓</span>}
    </form>
  );
}
