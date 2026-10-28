"use client";

import Link from "next/link";
import { useState } from "react";
import { EinsatzListe } from "@/components/EinsatzListe";
import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import { api } from "@/lib/api";
import { useAbfrage } from "@/lib/daten";
import { nachDatum, tagesTitel } from "@/lib/einsaetze";
import { heute } from "@/lib/format";
import { useBenoetige } from "@/lib/sitzung";
import { DARF_PLANEN, plusMonate } from "@/lib/technik";
import type { EinsatzZeile, TeamMitglied } from "@/lib/typen";

type Filter = { von: string; bis: string; monteur: string; nurOffen: boolean };

export default function Einsaetze() {
  const b = useBenoetige(DARF_PLANEN);
  const stichtag = heute();
  const [filter, setFilter] = useState<Filter>({ von: stichtag, bis: plusMonate(stichtag, 1), monteur: "", nurOffen: false });
  const { daten, fehler } = useAbfrage(
    () =>
      Promise.all([
        api<EinsatzZeile[]>("einsaetze", {
          p_von: filter.von || null,
          p_bis: filter.bis || null,
          p_monteur: filter.monteur || null,
          p_nur_offen: filter.nurOffen,
        }),
        api<TeamMitglied[]>("team"),
        api<EinsatzZeile[]>("einsaetze", { p_von: stichtag, p_ohne_monteur: true }),
      ]),
    [filter],
    !!b,
  );
  if (!b) return null;

  return (
    <>
      <Seitenkopf titel="Einsätze" aktionen={<Link className="btn-primaer" href="/einsaetze/neu/">+ Einsatz planen</Link>} />
      {daten && daten[2].length > 0 && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ⚠ {daten[2].length} {daten[2].length === 1 ? "kommender Einsatz hat" : "kommende Einsätze haben"} noch keinen Monteur.
        </p>
      )}

      <form
        className="karte mb-4 grid gap-3 sm:grid-cols-5 sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setFilter({ von: String(f.get("von")), bis: String(f.get("bis")), monteur: String(f.get("monteur")), nurOffen: f.get("offen") === "1" });
        }}
      >
        <div>
          <label className="feld-label" htmlFor="von">Von</label>
          <input className="eingabe" id="von" name="von" type="date" defaultValue={filter.von} />
        </div>
        <div>
          <label className="feld-label" htmlFor="bis">Bis</label>
          <input className="eingabe" id="bis" name="bis" type="date" defaultValue={filter.bis} />
        </div>
        <div>
          <label className="feld-label" htmlFor="monteur">Monteur</label>
          <select className="eingabe" id="monteur" name="monteur" defaultValue={filter.monteur}>
            <option value="">alle</option>
            {daten?.[1].map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm sm:pb-2">
          <input type="checkbox" name="offen" value="1" defaultChecked={filter.nurOffen} className="size-4" /> nur offene
        </label>
        <button className="btn-primaer">Anzeigen</button>
      </form>

      {!daten ? (
        <Laden fehler={fehler} />
      ) : daten[0].length === 0 ? (
        <p className="karte text-slate-600">Keine Einsätze in diesem Zeitraum.</p>
      ) : (
        <div className="space-y-5">
          {nachDatum(daten[0]).map(([datum, liste]) => (
            <section key={datum}>
              <h2 className="mb-2 text-sm font-semibold text-slate-600">{tagesTitel(datum, stichtag)}</h2>
              <EinsatzListe zeilen={liste} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
