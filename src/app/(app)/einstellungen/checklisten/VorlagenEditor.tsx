"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Anlagentyp, Pruefpunkt } from "@/db/schema";
import type { FormularZustand } from "@/lib/aktionen";
import { fehlertext } from "@/lib/api";
import { ANLAGENTYPEN } from "@/lib/technik";
import type { VorlagenDaten } from "../aktionen";

const TYPEN = { pruefung: "Prüfung (i. O. / nicht i. O.)", messwert: "Messwert (Zahl)", text: "Freitext" };

function neuerPunkt(): Pruefpunkt {
  return { id: Math.random().toString(36).slice(2, 10), text: "", typ: "pruefung", pflicht: true };
}

export function VorlagenEditor({ start, speichern }: { start: VorlagenDaten; speichern: (d: VorlagenDaten) => Promise<FormularZustand> }) {
  const [d, setD] = useState<VorlagenDaten>(start);
  const [meldung, setMeldung] = useState<FormularZustand>();
  const [laeuft, startTransition] = useTransition();
  const router = useRouter();

  const setPunkt = (i: number, teil: Partial<Pruefpunkt>) =>
    setD((alt) => ({ ...alt, punkte: alt.punkte.map((p, j) => (j === i ? { ...p, ...teil } : p)) }));
  const verschieben = (i: number, um: number) =>
    setD((alt) => {
      const punkte = [...alt.punkte];
      const [p] = punkte.splice(i, 1);
      punkte.splice(i + um, 0, p);
      return { ...alt, punkte };
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            const r = await speichern(d);
            if (r?.weiter) router.push(r.weiter);
            else setMeldung(r);
          } catch (fehler) {
            setMeldung({ fehler: fehlertext(fehler) });
          }
        });
      }}
    >
      <div className="karte grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="feld-label" htmlFor="name">Name *</label>
          <input className="eingabe" id="name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} required />
        </div>
        <div>
          <label className="feld-label" htmlFor="anlagentyp">Passt zu</label>
          <select
            className="eingabe"
            id="anlagentyp"
            value={d.anlagentyp ?? ""}
            onChange={(e) => setD({ ...d, anlagentyp: (e.target.value || null) as Anlagentyp | null })}
          >
            <option value="">allen Anlagen</option>
            {Object.entries(ANLAGENTYPEN).map(([wert, name]) => <option key={wert} value={wert}>{name}</option>)}
          </select>
        </div>
        <div className="flex flex-col justify-end gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4" checked={d.istWartung} onChange={(e) => setD({ ...d, istWartung: e.target.checked })} />
            Ist eine Wartung (setzt beim Abschluss das nächste Wartungsdatum)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4" checked={d.aktiv} onChange={(e) => setD({ ...d, aktiv: e.target.checked })} />
            Aktiv (kann bei Einsätzen gewählt werden)
          </label>
        </div>
      </div>

      <ol className="space-y-3">
        {d.punkte.map((p, i) => (
          <li key={p.id} className="karte grid gap-3 sm:grid-cols-[2rem_1fr_14rem]">
            <span className="pt-2 text-sm text-slate-400">{i + 1}.</span>
            <div className="space-y-2">
              <input className="eingabe" placeholder="Was wird geprüft?" value={p.text} onChange={(e) => setPunkt(i, { text: e.target.value })} aria-label={`Text Punkt ${i + 1}`} />
              <input className="eingabe" placeholder="Hilfetext (optional)" value={p.hilfe ?? ""} onChange={(e) => setPunkt(i, { hilfe: e.target.value })} aria-label={`Hilfe Punkt ${i + 1}`} />
              {p.typ === "messwert" && (
                <div className="grid grid-cols-3 gap-2">
                  <input className="eingabe" placeholder="Einheit" value={p.einheit ?? ""} onChange={(e) => setPunkt(i, { einheit: e.target.value })} aria-label="Einheit" />
                  <input className="eingabe" placeholder="min" inputMode="decimal" value={p.min ?? ""} onChange={(e) => setPunkt(i, { min: e.target.value === "" ? undefined : (e.target.value.replace(",", ".") as unknown as number) })} aria-label="Mindestwert" />
                  <input className="eingabe" placeholder="max" inputMode="decimal" value={p.max ?? ""} onChange={(e) => setPunkt(i, { max: e.target.value === "" ? undefined : (e.target.value.replace(",", ".") as unknown as number) })} aria-label="Höchstwert" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <select className="eingabe" value={p.typ} onChange={(e) => setPunkt(i, { typ: e.target.value as Pruefpunkt["typ"] })} aria-label="Art">
                {Object.entries(TYPEN).map(([wert, name]) => <option key={wert} value={wert}>{name}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4" checked={p.pflicht} onChange={(e) => setPunkt(i, { pflicht: e.target.checked })} /> Pflichtfeld
              </label>
              <div className="flex gap-1">
                <button type="button" className="btn px-2" disabled={i === 0} onClick={() => verschieben(i, -1)} aria-label="nach oben">↑</button>
                <button type="button" className="btn px-2" disabled={i === d.punkte.length - 1} onClick={() => verschieben(i, 1)} aria-label="nach unten">↓</button>
                <button type="button" className="btn-gefahr px-2" onClick={() => setD({ ...d, punkte: d.punkte.filter((_, j) => j !== i) })}>Entfernen</button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="btn" onClick={() => setD({ ...d, punkte: [...d.punkte, neuerPunkt()] })}>+ Prüfpunkt hinzufügen</button>

      {meldung?.fehler && <p className="fehler-box">{meldung.fehler}</p>}
      <div className="flex gap-2">
        <button className="btn-primaer" disabled={laeuft}>{laeuft ? "Speichern …" : "Speichern"}</button>
        <Link className="btn" href="/einstellungen/checklisten/">Abbrechen</Link>
      </div>
    </form>
  );
}
