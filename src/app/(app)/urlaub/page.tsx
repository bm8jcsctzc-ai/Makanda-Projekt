"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import { TeamKalender } from "@/components/TeamKalender";
import type { Abwesenheit, Urlaubskonto } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage, useParam } from "@/lib/daten";
import { formatDatum, formatMonat, heute } from "@/lib/format";
import { pfad } from "@/lib/pfade";
import { useBenoetige } from "@/lib/sitzung";
import { plusMonate, plusTage } from "@/lib/technik";
import type { AbwesenheitImKalender, TeamMitglied } from "@/lib/typen";
import { ARTEN, arbeitstage, DARF_EINTRAGEN, DARF_GENEHMIGEN, formatTage, konto, STATUS } from "@/lib/urlaub";
import { bundesland } from "@/lib/urlaub-daten";

type Uebersicht = { meine: Abwesenheit[]; konto: Urlaubskonto | null; offen: (Abwesenheit & { name: string })[] | null };

function Inhalt() {
  const b = useBenoetige();
  const stichtag = heute();
  const startMonat = useParam("monat");
  const [monat, setMonat] = useState(/^\d{4}-\d{2}$/.test(startMonat) ? startMonat : stichtag.slice(0, 7));
  const jahr = Number(stichtag.slice(0, 4));
  const { daten, fehler } = useAbfrage(
    () =>
      Promise.all([
        bundesland(),
        api<TeamMitglied[]>("team"),
        api<AbwesenheitImKalender[]>("abwesenheiten", { p_von: `${monat}-01`, p_bis: plusTage(plusMonate(`${monat}-01`, 1), -1) }),
        api<Uebersicht>("urlaub_uebersicht", { p_jahr: jahr }),
      ]),
    [monat],
    !!b,
  );
  if (!b) return null;
  if (!daten) return <Laden fehler={fehler} />;
  const [land, alleImTeam, imMonat, { meine, konto: kontoEintrag, offen }] = daten;
  const team = alleImTeam.filter((m) => m.imTeam);
  const verwaltet = DARF_EINTRAGEN.includes(b.rolle);
  const meinKonto = b.imTeam
    ? konto(meine, jahr, kontoEintrag?.anspruchTage ?? b.urlaubstageProJahr, kontoEintrag?.uebertragHalbeTage ?? 0, land)
    : null;
  const meineAktuellen = meine.filter((a) => a.bis >= `${jahr}-01-01`);

  return (
    <>
      <Seitenkopf
        titel="Urlaub & Abwesenheiten"
        aktionen={
          <>
            {DARF_GENEHMIGEN.includes(b.rolle) && <Link className="btn" href="/urlaub/konten/">Urlaubskonten</Link>}
            <Link className="btn-primaer" href="/urlaub/neu/">{verwaltet ? "+ Abwesenheit eintragen" : "+ Urlaub beantragen"}</Link>
          </>
        }
      />

      {verwaltet && !land && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Noch kein Bundesland eingestellt – es werden nur bundesweite Feiertage berücksichtigt.{" "}
          <Link className="underline" href="/einstellungen/wartung/">Jetzt einstellen</Link>
        </p>
      )}

      {offen && offen.length > 0 && (
        <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="mb-2 font-semibold text-amber-900">Offene Anträge · {offen.length}</h2>
          <ul className="space-y-2">
            {offen.map((a) => (
              <li key={a.id}>
                <Link href={pfad.abwesenheit(a.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 hover:bg-amber-100/50">
                  <span>
                    <strong>{a.name}</strong> · {formatDatum(a.von)} – {formatDatum(a.bis)}
                  </span>
                  <span className="text-sm text-slate-600">{formatTage(arbeitstage(a, land))} · prüfen →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button className="btn px-3" onClick={() => setMonat(plusMonate(`${monat}-01`, -1).slice(0, 7))} aria-label="Vormonat">‹</button>
          <h2 className="font-semibold">{formatMonat(monat)}</h2>
          <button className="btn px-3" onClick={() => setMonat(plusMonate(`${monat}-01`, 1).slice(0, 7))} aria-label="Nächster Monat">›</button>
        </div>
        {team.length === 0 ? (
          <p className="karte text-sm text-slate-600">Noch keine Mitarbeiter im Team. (Benutzer › „im Urlaubsplaner“)</p>
        ) : (
          <TeamKalender monat={monat} team={team} abwesenheiten={imMonat} land={land} betrachter={b} heute={stichtag} />
        )}
      </section>

      {meinKonto && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="karte">
            <h2 className="mb-3 font-semibold">Mein Urlaub {jahr}</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
              <dt className="text-slate-600">Anspruch</dt>
              <dd className="text-right tabular-nums">{formatTage(meinKonto.anspruch)}</dd>
              {meinKonto.uebertrag > 0 && (
                <>
                  <dt className="text-slate-600">Übertrag Vorjahr</dt>
                  <dd className="text-right tabular-nums">+ {formatTage(meinKonto.uebertrag)}</dd>
                </>
              )}
              <dt className="text-slate-600">Genehmigt</dt>
              <dd className="text-right tabular-nums">− {formatTage(meinKonto.genehmigt)}</dd>
              <dt className="text-slate-600">Beantragt</dt>
              <dd className="text-right tabular-nums">− {formatTage(meinKonto.beantragt)}</dd>
              <dt className="border-t border-slate-200 pt-1 font-semibold">Rest</dt>
              <dd className="border-t border-slate-200 pt-1 text-right font-semibold tabular-nums" data-testid="resturlaub">
                {formatTage(meinKonto.rest)}
              </dd>
            </dl>
          </section>
          <section className="karte lg:col-span-2">
            <h2 className="mb-3 font-semibold">Meine Abwesenheiten</h2>
            {meineAktuellen.length === 0 ? (
              <p className="text-sm text-slate-600">Noch nichts eingetragen.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {meineAktuellen.map((a) => (
                  <li key={a.id}>
                    <Link href={pfad.abwesenheit(a.id)} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm hover:underline">
                      <span>
                        {ARTEN[a.art].name}: {formatDatum(a.von)}
                        {a.bis !== a.von && ` – ${formatDatum(a.bis)}`} · {formatTage(arbeitstage(a, land))}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[a.status].klasse}`}>{STATUS[a.status].text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default function Urlaub() {
  return <Suspense><Inhalt /></Suspense>;
}
