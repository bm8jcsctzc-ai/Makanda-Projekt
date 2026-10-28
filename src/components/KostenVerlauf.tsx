"use client";

import { useEffect, useRef, useState } from "react";
import { formatEuro, formatMonat, formatMonatKurz } from "@/lib/format";
import type { MonatsWerte } from "@/lib/finanzen";

// Feste Farbe pro Kostenart – bleibt gleich, auch wenn eine Art ausgeblendet ist.
// Palette geprüft (Farbsehschwäche, Abstand); Aqua liegt unter 3:1 Kontrast, daher gibt es die Tabellenansicht.
export const SERIEN = [
  { schluessel: "rechnungenCent", name: "Rechnungen", farbe: "#2a78d6" },
  { schluessel: "fixkostenCent", name: "Fixkosten", farbe: "#eb6834" },
  { schluessel: "personalCent", name: "Personal", farbe: "#1baf7a" },
] as const;

const HOEHE = 260;
const SCHMAL = 520; // darunter nur die letzten 6 Monate, damit die Beschriftung lesbar bleibt
const RAND = { oben: 12, rechts: 8, unten: 28, links: 52 };
const LUECKE = 2;

function kompakt(cent: number) {
  const euro = cent / 100;
  if (euro >= 1000) return `${(euro / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} T€`;
  return `${euro.toLocaleString("de-DE")} €`;
}

/** Saubere Achsenschritte: 1, 2 oder 5 mal Zehnerpotenz */
function achse(max: number): number[] {
  if (max <= 0) return [0];
  const roh = max / 4;
  const zehner = 10 ** Math.floor(Math.log10(roh));
  const schritt = [1, 2, 5, 10].map((f) => f * zehner).find((s) => s >= roh)!;
  return Array.from({ length: Math.ceil(max / schritt) + 1 }, (_, i) => i * schritt);
}

export function KostenVerlauf({ werte: alleWerte, mitPersonal }: { werte: MonatsWerte[]; mitPersonal: boolean }) {
  const [aktiv, setAktiv] = useState<number | null>(null);
  // Das Diagramm wird in echter Pixelbreite gezeichnet, damit die Schrift überall gleich groß ist
  const behaelter = useRef<HTMLDivElement>(null);
  const [breite, setBreite] = useState(720);
  useEffect(() => {
    const el = behaelter.current;
    if (!el) return;
    const beobachter = new ResizeObserver(([e]) => setBreite(Math.round(e.contentRect.width)));
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);
  const werte = breite < SCHMAL ? alleWerte.slice(-6) : alleWerte;
  const serien = SERIEN.filter((s) => mitPersonal || s.schluessel !== "personalCent");
  const summe = (w: MonatsWerte) => serien.reduce((s, x) => s + w[x.schluessel], 0);
  const ticks = achse(Math.max(...werte.map(summe), 0));
  const yMax = ticks[ticks.length - 1] || 1;

  const innenB = breite - RAND.links - RAND.rechts;
  const innenH = HOEHE - RAND.oben - RAND.unten;
  const spalte = innenB / werte.length;
  const balkenB = Math.min(36, spalte * 0.6);
  const y = (cent: number) => RAND.oben + innenH - (cent / yMax) * innenH;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-sm text-slate-700">
        {serien.map((s) => (
          <span key={s.schluessel} className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm" style={{ background: s.farbe }} />
            {s.name}
          </span>
        ))}
      </div>

      <div className="relative" ref={behaelter}>
        <svg width={breite} height={HOEHE} viewBox={`0 0 ${breite} ${HOEHE}`} className="block max-w-full" role="img" aria-label={`Kosten der letzten ${werte.length} Monate`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={RAND.links} x2={breite - RAND.rechts} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={RAND.links - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#64748b">
                {kompakt(t)}
              </text>
            </g>
          ))}

          {werte.map((w, i) => {
            const x = RAND.links + i * spalte + (spalte - balkenB) / 2;
            let basis = 0;
            const sichtbar = serien.filter((s) => w[s.schluessel] > 0);
            return (
              <g key={w.monat} opacity={aktiv === null || aktiv === i ? 1 : 0.45}>
                {sichtbar.map((s, j) => {
                  const unten = y(basis);
                  basis += w[s.schluessel];
                  const oben = y(basis);
                  // Lücke zwischen Segmenten; das oberste Segment bekommt runde Ecken
                  const boden = unten - (j > 0 ? LUECKE : 0);
                  const h = Math.max(0, boden - oben);
                  const r = j === sichtbar.length - 1 ? Math.min(4, h) : 0;
                  return (
                    <path
                      key={s.schluessel}
                      fill={s.farbe}
                      d={`M${x},${boden} V${oben + r} q0,${-r} ${r},${-r} H${x + balkenB - r} q${r},0 ${r},${r} V${boden} Z`}
                    />
                  );
                })}
                <text x={x + balkenB / 2} y={HOEHE - 8} textAnchor="middle" fontSize={11} fill="#64748b">
                  {formatMonatKurz(w.monat)}
                </text>
                {/* Trefferfläche größer als der Balken */}
                <rect
                  x={RAND.links + i * spalte}
                  y={RAND.oben}
                  width={spalte}
                  height={innenH}
                  fill="transparent"
                  onMouseEnter={() => setAktiv(i)}
                  onMouseLeave={() => setAktiv(null)}
                  onClick={() => setAktiv(aktiv === i ? null : i)}
                />
              </g>
            );
          })}
        </svg>

        {aktiv !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-48 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg"
            style={{
              left: `clamp(0px, calc(${((RAND.links + (aktiv + 0.5) * spalte) / breite) * 100}% - 6rem), calc(100% - 12rem))`,
            }}
          >
            <p className="mb-1 font-semibold">{formatMonat(werte[aktiv].monat)}</p>
            {serien.map((s) => (
              <p key={s.schluessel} className="flex items-center justify-between gap-2 text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-sm" style={{ background: s.farbe }} />
                  {s.name}
                </span>
                <span className="tabular-nums">{formatEuro(werte[aktiv][s.schluessel])}</span>
              </p>
            ))}
            <p className="mt-1 flex justify-between border-t border-slate-100 pt-1 font-medium">
              <span>Gesamt</span>
              <span className="tabular-nums">{formatEuro(summe(werte[aktiv]))}</span>
            </p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-slate-600">Als Tabelle anzeigen</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="tabelle">
            <thead>
              <tr>
                <th>Monat</th>
                {serien.map((s) => <th key={s.schluessel} className="betrag">{s.name}</th>)}
                <th className="betrag">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {alleWerte.map((w) => (
                <tr key={w.monat}>
                  <td>{formatMonat(w.monat)}</td>
                  {serien.map((s) => <td key={s.schluessel} className="betrag">{formatEuro(w[s.schluessel])}</td>)}
                  <td className="betrag font-medium">{formatEuro(summe(w))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
