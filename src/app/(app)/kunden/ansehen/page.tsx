"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Laden, NichtGefunden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import { Angaben, HinweisBox, StatusMarke } from "@/components/Status";
import type { Anlage, Einsatz, Kunde } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage, useParam } from "@/lib/daten";
import { formatDatum, heute } from "@/lib/format";
import { pfad } from "@/lib/pfade";
import { useBenoetige } from "@/lib/sitzung";
import { adresse, anlagenName, DARF_PLANEN, EINSATZARTEN, navigationsLink } from "@/lib/technik";

type KundeDaten = { kunde: Kunde; anlagen: Anlage[]; einsaetze: { e: Einsatz; monteur: string | null }[] };

function Inhalt() {
  const b = useBenoetige();
  const id = useParam("id");
  const { daten, fehler } = useAbfrage(() => api<KundeDaten | null>("kunde", { p_id: id }), [id], !!b && !!id);
  if (!b) return null;
  if (daten === null) return <NichtGefunden was="Der Kunde" />;
  if (!daten) return <Laden fehler={fehler} />;
  const { kunde: k, anlagen, einsaetze } = daten;
  const planer = DARF_PLANEN.includes(b.rolle);
  const nav = navigationsLink(k);
  const stichtag = heute();

  return (
    <>
      <Seitenkopf
        titel={k.name}
        untertitel={k.taifunKundennr ? `TAIFUN-Kundennr. ${k.taifunKundennr}` : undefined}
        aktionen={
          planer && (
            <>
              <Link className="btn" href={pfad.kundeBearbeiten(id)}>Bearbeiten</Link>
              <Link className="btn-primaer" href={pfad.einsatzNeu({ kunde: id })}>+ Einsatz planen</Link>
            </>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="karte space-y-3">
          <h2 className="font-semibold">Kontakt</h2>
          <Angaben
            werte={[
              ["Ansprechpartner", k.ansprechpartner],
              ["Adresse", adresse(k) && (nav ? <a className="text-marke underline" href={nav} target="_blank">{adresse(k)}</a> : adresse(k))],
              ["Telefon", k.telefon && <a className="text-marke underline" href={`tel:${k.telefon.replace(/[^\d+]/g, "")}`}>{k.telefon}</a>],
              ["E-Mail", k.email && <a className="text-marke underline" href={`mailto:${k.email}`}>{k.email}</a>],
            ]}
          />
          <HinweisBox text={k.hinweise} />
        </section>

        <section className="karte lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Anlagen</h2>
            <Link className="btn" href={pfad.anlageNeu(id)}>+ Anlage</Link>
          </div>
          {anlagen.length === 0 ? (
            <p className="text-sm text-slate-600">Noch keine Anlage erfasst.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {anlagen.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                  <div>
                    <Link className="font-medium text-marke hover:underline" href={pfad.anlage(a.id)}>{anlagenName(a)}</Link>
                    <div className="text-xs text-slate-500">
                      {[a.aufstellort, a.baujahr && `Baujahr ${a.baujahr}`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className={`text-sm ${a.naechsteWartungAm && a.naechsteWartungAm < stichtag ? "font-medium text-red-700" : "text-slate-600"}`}>
                    {a.naechsteWartungAm ? `Wartung fällig ${formatDatum(a.naechsteWartungAm)}` : "kein Wartungstermin"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="karte lg:col-span-3">
          <h2 className="mb-3 font-semibold">Einsätze</h2>
          {einsaetze.length === 0 ? (
            <p className="text-sm text-slate-600">Noch keine Einsätze.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {einsaetze.map(({ e, monteur }) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <Link className="text-marke hover:underline" href={pfad.einsatz(e.id)}>
                    {formatDatum(e.datum)} · {EINSATZARTEN[e.art]}
                    {e.beschreibung && <span className="text-slate-600"> – {e.beschreibung}</span>}
                  </Link>
                  <span className="flex items-center gap-2 text-slate-500">
                    {monteur}
                    <StatusMarke status={e.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

export default function KundeAnsehen() {
  return <Suspense><Inhalt /></Suspense>;
}
