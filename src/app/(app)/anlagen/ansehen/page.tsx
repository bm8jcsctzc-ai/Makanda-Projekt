"use client";

import Link from "next/link";
import { Suspense } from "react";
import { FotoGalerie } from "@/components/FotoGalerie";
import { FotoHochladen } from "@/components/FotoHochladen";
import { Laden, NichtGefunden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import { Angaben, StatusMarke } from "@/components/Status";
import type { Anlage, ChecklisteErgebnis, Einsatz, Kunde } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage, useParam } from "@/lib/daten";
import { formatDatum, heute } from "@/lib/format";
import { pfad } from "@/lib/pfade";
import { useBenoetige } from "@/lib/sitzung";
import { anlagenName, ANLAGENTYPEN, EINSATZARTEN, pruefeChecklist } from "@/lib/technik";
import type { FotoMitPfad } from "@/lib/typen";

type Akte = {
  anlage: Anlage;
  kunde: Kunde;
  fotos: FotoMitPfad[];
  checklisten: (ChecklisteErgebnis & { datum: string; von: string | null })[];
  einsaetze: Einsatz[];
};

function Inhalt() {
  const b = useBenoetige();
  const id = useParam("id");
  const { daten, fehler, neuLaden } = useAbfrage(() => api<Akte | null>("anlage", { p_id: id }), [id], !!b && !!id);
  if (!b) return null;
  if (daten === null) return <NichtGefunden was="Die Anlage" />;
  if (!daten) return <Laden fehler={fehler} />;
  const { anlage: a, kunde: k, fotos, checklisten, einsaetze } = daten;
  const ueberfaellig = a.naechsteWartungAm != null && a.naechsteWartungAm < heute();

  return (
    <>
      <Seitenkopf
        titel={anlagenName(a)}
        untertitel={<>bei <Link className="text-marke underline" href={pfad.kunde(k.id)}>{k.name}</Link></>}
        aktionen={<Link className="btn" href={pfad.anlageBearbeiten(id)}>Bearbeiten</Link>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="karte lg:col-span-2">
          <h2 className="mb-3 font-semibold">Technische Daten</h2>
          <Angaben
            werte={[
              ["Art", ANLAGENTYPEN[a.typ]],
              ["Hersteller", a.hersteller],
              ["Modell / Typ", a.modell],
              ["Seriennummer", a.seriennummer],
              ["Baujahr", a.baujahr],
              ["Leistung", a.leistungKw && `${a.leistungKw} kW`],
              ["Kältemittel", a.kaeltemittel && `${a.kaeltemittel}${a.kaeltemittelKg ? `, ${a.kaeltemittelKg} kg` : ""}`],
              ["Aufstellort", a.aufstellort],
              ["Notiz", a.notiz && <span className="whitespace-pre-line">{a.notiz}</span>],
            ]}
          />
        </section>

        <section className={`karte ${ueberfaellig ? "border-red-200 bg-red-50" : ""}`}>
          <h2 className="mb-3 font-semibold">Wartung</h2>
          <Angaben
            werte={[
              ["Intervall", `alle ${a.wartungsintervallMonate} Monate`],
              ["Letzte", formatDatum(a.letzteWartungAm)],
              ["Nächste", <span key="n" className={ueberfaellig ? "font-semibold text-red-700" : ""}>{formatDatum(a.naechsteWartungAm)}{ueberfaellig && " – überfällig"}</span>],
            ]}
          />
        </section>

        <section className="karte space-y-3 lg:col-span-3">
          <h2 className="font-semibold">Fotos</h2>
          <FotoHochladen kundeId={k.id} anlageId={a.id} standardKategorie="typenschild" fertig={neuLaden} />
          <FotoGalerie fotos={fotos} benutzer={b} nachher={neuLaden} />
        </section>

        <section className="karte lg:col-span-2">
          <h2 className="mb-3 font-semibold">Checklisten & Messwerte</h2>
          {checklisten.length === 0 ? (
            <p className="text-sm text-slate-600">Noch keine Checklisten zu dieser Anlage.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {checklisten.map((c) => {
                const p = pruefeChecklist(c.punkte, c.antworten);
                const auffaellig = p.maengel.length + p.ausserhalb.length;
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <Link className="text-marke hover:underline" href={pfad.checkliste(c.id)}>
                      {formatDatum(c.datum)} · {c.name}
                    </Link>
                    <span className="flex items-center gap-2 text-slate-500">
                      {c.von}
                      {!c.abgeschlossen ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">offen</span>
                      ) : auffaellig ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">⚠ {auffaellig} auffällig</span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">✓ alles i. O.</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="karte">
          <h2 className="mb-3 font-semibold">Einsätze</h2>
          {einsaetze.length === 0 ? (
            <p className="text-sm text-slate-600">Noch keine Einsätze.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {einsaetze.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <Link className="text-marke hover:underline" href={pfad.einsatz(e.id)}>
                    {formatDatum(e.datum)} · {EINSATZARTEN[e.art]}
                  </Link>
                  <StatusMarke status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

export default function Anlagenakte() {
  return <Suspense><Inhalt /></Suspense>;
}
