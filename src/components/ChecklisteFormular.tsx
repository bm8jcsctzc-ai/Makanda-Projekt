"use client";

import { useEffect, useState, useTransition } from "react";
import { checklisteSpeichern } from "@/app/(app)/einsaetze/checkliste-actions";
import type { Antwort, Pruefpunkt } from "@/db/schema";
import type { FormularZustand } from "@/lib/aktionen";
import { istAusserhalb, parseZahl } from "@/lib/technik";

const PRUEF_OPTIONEN = [
  { wert: "io", text: "i. O.", aktiv: "bg-green-600 text-white border-green-600" },
  { wert: "nio", text: "nicht i. O.", aktiv: "bg-red-600 text-white border-red-600" },
  { wert: "entfaellt", text: "entfällt", aktiv: "bg-slate-600 text-white border-slate-600" },
];

const zahl = (z: number) => z.toLocaleString("de-DE");

export function richtwert(p: Pruefpunkt): string | null {
  const e = p.einheit ? ` ${p.einheit}` : "";
  if (p.min != null && p.max != null) return `Richtwert ${zahl(p.min)}–${zahl(p.max)}${e}`;
  if (p.min != null) return `Richtwert mind. ${zahl(p.min)}${e}`;
  if (p.max != null) return `Richtwert max. ${zahl(p.max)}${e}`;
  return null;
}

export function ChecklisteFormular({ ergebnisId, punkte, start }: { ergebnisId: string; punkte: Pruefpunkt[]; start: Record<string, Antwort> }) {
  const [antworten, setAntworten] = useState(start);
  const [geaendert, setGeaendert] = useState(false);
  const [meldung, setMeldung] = useState<FormularZustand>();
  const [laeuft, startTransition] = useTransition();

  // Warnung beim Verlassen der Seite mit ungespeicherten Eingaben
  useEffect(() => {
    if (!geaendert) return;
    const warnen = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warnen);
    return () => window.removeEventListener("beforeunload", warnen);
  }, [geaendert]);

  function setze(id: string, teil: Partial<Antwort>) {
    setAntworten((alt) => ({ ...alt, [id]: { ...alt[id], ...teil } }));
    setGeaendert(true);
    setMeldung(undefined);
  }

  function speichern(abschliessen: boolean) {
    startTransition(async () => {
      const antwort = await checklisteSpeichern(ergebnisId, antworten, abschliessen);
      setMeldung(antwort);
      if (!antwort?.fehler) setGeaendert(false);
    });
  }

  const ausgefuellt = punkte.filter((p) => antworten[p.id]?.wert?.trim()).length;

  return (
    <div className="pb-28">
      <ol className="space-y-3">
        {punkte.map((p, i) => {
          const a = antworten[p.id] ?? {};
          const auffaellig = a.wert === "nio" || istAusserhalb(p, a.wert);
          const keineZahl = p.typ === "messwert" && !!a.wert?.trim() && parseZahl(a.wert) == null;
          return (
            <li key={p.id} className={`karte ${auffaellig ? "border-red-300" : ""}`} data-punkt={p.id}>
              <p className="font-medium">
                <span className="mr-1 text-slate-400">{i + 1}.</span>
                {p.text}
                {p.pflicht && <span className="text-red-600" title="Pflichtfeld"> *</span>}
              </p>
              {p.hilfe && <p className="mt-0.5 text-xs text-slate-500">{p.hilfe}</p>}

              <div className="mt-3">
                {p.typ === "pruefung" && (
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={p.text}>
                    {PRUEF_OPTIONEN.map((o) => (
                      <button
                        key={o.wert}
                        type="button"
                        role="radio"
                        aria-checked={a.wert === o.wert}
                        onClick={() => setze(p.id, { wert: a.wert === o.wert ? "" : o.wert })}
                        className={`rounded-lg border px-2 py-3 text-sm font-medium ${a.wert === o.wert ? o.aktiv : "border-slate-300 bg-white text-slate-700"}`}
                      >
                        {o.text}
                      </button>
                    ))}
                  </div>
                )}
                {p.typ === "messwert" && (
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        className="eingabe max-w-40"
                        inputMode="decimal"
                        value={a.wert ?? ""}
                        onChange={(e) => setze(p.id, { wert: e.target.value })}
                        aria-label={p.text}
                      />
                      {p.einheit && <span className="text-slate-600">{p.einheit}</span>}
                    </div>
                    {richtwert(p) && <p className="mt-1 text-xs text-slate-500">{richtwert(p)}</p>}
                    {keineZahl && <p className="mt-1 text-sm text-red-700">Bitte eine Zahl eingeben, z. B. 1,5</p>}
                    {istAusserhalb(p, a.wert) && <p className="mt-1 text-sm font-medium text-red-700">⚠ Außerhalb des Richtwerts</p>}
                  </div>
                )}
                {p.typ === "text" && (
                  <textarea className="eingabe" rows={2} value={a.wert ?? ""} onChange={(e) => setze(p.id, { wert: e.target.value })} aria-label={p.text} />
                )}
              </div>

              {(auffaellig || a.bemerkung) && (
                <div className="mt-3">
                  <label className="feld-label" htmlFor={`bem-${p.id}`}>Bemerkung {auffaellig && "– was ist auffällig, was wurde getan?"}</label>
                  <textarea className="eingabe" id={`bem-${p.id}`} rows={2} value={a.bemerkung ?? ""} onChange={(e) => setze(p.id, { bemerkung: e.target.value })} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] backdrop-blur">
        <div className="mx-auto max-w-6xl space-y-2">
          {meldung?.fehler && <p className="fehler-box">{meldung.fehler}</p>}
          {meldung?.erfolg && !geaendert && <p className="text-sm text-green-700">✓ {meldung.erfolg}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-auto text-sm text-slate-600">
              {ausgefuellt} von {punkte.length} ausgefüllt
              {geaendert && <span className="text-amber-700"> · nicht gespeichert</span>}
            </span>
            <button type="button" className="btn" disabled={laeuft} onClick={() => speichern(false)}>Zwischenspeichern</button>
            <button type="button" className="btn-primaer" disabled={laeuft} onClick={() => speichern(true)}>
              {laeuft ? "Speichern …" : "Abschließen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
