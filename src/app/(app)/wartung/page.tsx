"use client";

import Link from "next/link";
import { useState } from "react";
import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import type { Einstellungen } from "@/db/schema";
import { api, fehlertext } from "@/lib/api";
import { useAbfrage } from "@/lib/daten";
import { formatDatum, formatMonat, heute } from "@/lib/format";
import { herunterladen } from "@/lib/herunterladen";
import { pfad } from "@/lib/pfade";
import { useBenoetige } from "@/lib/sitzung";
import { anlagenName, DARF_PLANEN, plusMonate } from "@/lib/technik";
import type { WartungsZeile } from "@/lib/typen";
import { monatsLast, naechsteMonate, wartungsStatus } from "@/lib/wartungsplan";

const ZEITRAEUME = { "3": "Überfällige und nächste 3 Monate", "12": "Überfällige und nächste 12 Monate", alle: "Alle Anlagen" } as const;

function Kennzahl({ titel, wert, hinweis, warnung = false }: { titel: string; wert: number; hinweis?: string; warnung?: boolean }) {
  return (
    <div className={`karte ${warnung && wert > 0 ? "border-red-200 bg-red-50" : ""}`}>
      <p className="text-sm text-slate-600">{titel}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${warnung && wert > 0 ? "text-red-700" : ""}`}>{wert}</p>
      {hinweis && <p className="mt-1 text-xs text-slate-500">{hinweis}</p>}
    </div>
  );
}

/** Excel mit allen Wartungskunden im Browser erzeugen und herunterladen */
async function excelHerunterladen(zeilen: WartungsZeile[], e: Einstellungen, stichtag: string) {
  const { wartungsExcel } = await import("@/lib/excel");
  herunterladen(await wartungsExcel(zeilen, stichtag, e.erinnerungVorlaufMonate, e.haeufungGrenze), `Wartungskunden_${stichtag}.xlsx`);
}

export default function Wartungsplan() {
  const b = useBenoetige(DARF_PLANEN);
  const [zeitraum, setZeitraum] = useState<keyof typeof ZEITRAEUME>("3");
  const [q, setQ] = useState("");
  const [excelFehler, setExcelFehler] = useState<string>();
  const stichtag = heute();
  const { daten, fehler } = useAbfrage(
    () => Promise.all([api<Einstellungen>("einstellungen"), api<WartungsZeile[]>("wartungen")]),
    [],
    !!b,
  );
  if (!b) return null;
  if (!daten) return <Laden fehler={fehler} />;
  const [e, alle] = daten;
  const vorlauf = e.erinnerungVorlaufMonate;

  const mitTermin = alle.filter((w) => w.a.naechsteWartungAm);
  const status = (w: WartungsZeile) => wartungsStatus(w.a.naechsteWartungAm, stichtag, vorlauf);
  const ueberfaellig = mitTermin.filter((w) => status(w) === "ueberfaellig");
  const baldOhneTermin = mitTermin.filter((w) => status(w) === "bald" && !w.geplantAm);
  const geplant = mitTermin.filter((w) => w.geplantAm);
  const ohneTermin = alle.filter((w) => !w.a.naechsteWartungAm);

  const monate = naechsteMonate(stichtag.slice(0, 7), 12);
  const last = monatsLast(mitTermin.map((w) => w.a.naechsteWartungAm!), monate, e.haeufungGrenze);
  const maxLast = Math.max(1, ...last.monate.map((m) => m.anzahl));
  const haeufungen = last.monate.filter((m) => m.auffaellig);

  // Liste filtern und nach Monat gruppieren
  const bis = zeitraum === "alle" ? null : plusMonate(stichtag, Number(zeitraum));
  const suche = q.trim().toLowerCase();
  const liste = mitTermin.filter(
    (w) =>
      (!bis || w.a.naechsteWartungAm! <= bis) &&
      (!suche || [w.k.name, w.k.ort, w.a.hersteller, w.a.modell].some((t) => t?.toLowerCase().includes(suche))),
  );
  const gruppen = new Map<string, WartungsZeile[]>();
  for (const w of liste) {
    const titel = status(w) === "ueberfaellig" ? "Überfällig" : formatMonat(w.a.naechsteWartungAm!.slice(0, 7));
    gruppen.set(titel, [...(gruppen.get(titel) ?? []), w]);
  }

  return (
    <>
      <Seitenkopf
        titel="Wartungsplan"
        untertitel={`Erinnerung an Kunden ${vorlauf} Monate vor Fälligkeit`}
        aktionen={
          <button
            type="button"
            className="btn-primaer"
            onClick={() => excelHerunterladen(alle, e, stichtag).catch((err) => setExcelFehler(fehlertext(err)))}
          >
            ⬇ Excel herunterladen
          </button>
        }
      />
      {excelFehler && <p className="fehler-box mb-4">{excelFehler}</p>}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kennzahl titel="Überfällig" wert={ueberfaellig.length} warnung />
        <Kennzahl titel={`Fällig in ${vorlauf} Monaten, ohne Termin`} wert={baldOhneTermin.length} />
        <Kennzahl titel="Termin geplant" wert={geplant.length} />
        <Kennzahl titel="Anlagen gesamt" wert={alle.length} hinweis={ohneTermin.length ? `${ohneTermin.length} ohne Wartungstermin` : undefined} />
      </div>

      {haeufungen.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">⚠ Monate mit vielen Wartungen – besser früh planen</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {haeufungen.map((m) => (
              <li key={m.monat}>
                <strong>{formatMonat(m.monat)}:</strong> {m.anzahl} Wartungen ({m.grund}).
                {m.ausweichen?.length ? ` Tipp: einige Termine in ${m.ausweichen.map(formatMonat).join(" oder ")} vorziehen.` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <section className="karte lg:col-span-2">
          <h2 className="mb-1 font-semibold">Wartungen pro Monat</h2>
          <p className="mb-3 text-xs text-slate-500">
            Durchschnitt {last.durchschnitt.toLocaleString("de-DE", { maximumFractionDigits: 1 })} pro Monat · überfällige zählen in den aktuellen Monat
          </p>
          <ul className="space-y-1.5">
            {last.monate.map((m) => (
              <li key={m.monat} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="whitespace-nowrap text-slate-700">{formatMonat(m.monat)}</span>
                <span className="h-4 rounded-r bg-slate-100">
                  {m.anzahl > 0 && (
                    <span
                      className="block h-4 rounded-r"
                      style={{ width: `${(m.anzahl / maxLast) * 100}%`, background: m.auffaellig ? "#d97706" : "#2a78d6" }}
                    />
                  )}
                </span>
                <span className={`text-right tabular-nums ${m.auffaellig ? "font-semibold text-amber-800" : "text-slate-700"}`}>
                  {m.auffaellig && "⚠ "}
                  {m.anzahl}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="karte space-y-3">
          <h2 className="font-semibold">Automatische E-Mails</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>täglich: Erinnerung an Kunden {vorlauf} Monate vor der Wartung, Übersicht an das Büro</li>
            <li>montags: Excel mit allen Wartungskunden an das Büro</li>
          </ul>
          {e.bueroEmail ? (
            <p className="text-sm text-slate-600">Büro-Adresse: {e.bueroEmail}</p>
          ) : (
            <p className="fehler-box">Noch keine Büro-E-Mail eingetragen.</p>
          )}
          <p className="text-sm text-slate-600">
            Die E-Mails verschickt der Automatik-Dienst (GitHub Actions). Was verschickt wurde, steht im{" "}
            <Link className="text-marke underline" href="/einstellungen/emails/">E-Mail-Protokoll</Link>.
          </p>
          <Link className="text-sm text-marke underline" href="/einstellungen/wartung/">Einstellungen und Text der Erinnerung</Link>
        </section>
      </div>

      <form
        className="karte mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(ev) => {
          ev.preventDefault();
          const f = new FormData(ev.currentTarget);
          setZeitraum(String(f.get("zeitraum")) as keyof typeof ZEITRAEUME);
          setQ(String(f.get("q")));
        }}
      >
        <div>
          <label className="feld-label" htmlFor="zeitraum">Zeitraum</label>
          <select className="eingabe" id="zeitraum" name="zeitraum" defaultValue={zeitraum}>
            {Object.entries(ZEITRAEUME).map(([wert, text]) => <option key={wert} value={wert}>{text}</option>)}
          </select>
        </div>
        <div>
          <label className="feld-label" htmlFor="q">Suche</label>
          <input className="eingabe" id="q" name="q" type="search" defaultValue={q} placeholder="Kunde, Ort, Hersteller" />
        </div>
        <button className="btn-primaer">Anzeigen</button>
      </form>

      {liste.length === 0 ? (
        <p className="karte text-slate-600">{alle.length === 0 ? "Noch keine Anlagen erfasst." : "Keine Wartungen in diesem Zeitraum."}</p>
      ) : (
        <div className="space-y-5">
          {[...gruppen.entries()].map(([titel, zeilen]) => (
            <section key={titel}>
              <h2 className={`mb-2 text-sm font-semibold ${titel === "Überfällig" ? "text-red-700" : "text-slate-600"}`}>
                {titel} · {zeilen.length}
              </h2>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-flaeche">
                {zeilen.map((w) => (
                  <li key={w.a.id} className="grid gap-2 p-3 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
                    <span className={`text-sm font-medium tabular-nums ${titel === "Überfällig" ? "text-red-700" : ""}`}>
                      {formatDatum(w.a.naechsteWartungAm)}
                    </span>
                    <span className="min-w-0">
                      <Link className="font-medium text-marke hover:underline" href={pfad.kunde(w.k.id)}>{w.k.name}</Link>
                      {w.k.ort && <span className="text-slate-500"> · {w.k.ort}</span>}
                      <Link className="block truncate text-sm text-slate-600 hover:underline" href={pfad.anlage(w.a.id)}>{anlagenName(w.a)}</Link>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      {w.geplantAm ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Termin {formatDatum(w.geplantAm)}</span>
                      ) : (
                        <>
                          {w.erinnertAm && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
                              erinnert {formatDatum(w.erinnertAm.toISOString().slice(0, 10))}
                            </span>
                          )}
                          {!w.k.email && <span className="text-xs text-slate-500">keine E-Mail</span>}
                          <Link
                            className="btn py-1"
                            href={pfad.einsatzNeu({ kunde: w.k.id, anlage: w.a.id, datum: w.a.naechsteWartungAm! < stichtag ? stichtag : w.a.naechsteWartungAm })}
                          >
                            Termin planen
                          </Link>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
