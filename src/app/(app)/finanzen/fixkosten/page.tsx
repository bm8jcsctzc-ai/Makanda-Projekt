"use client";

import Link from "next/link";
import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import { useAbfrage } from "@/lib/daten";
import { ladeFinanzen } from "@/lib/finanz-daten";
import { pfad } from "@/lib/pfade";
import { DARF_FINANZEN } from "@/lib/rechte";
import { useBenoetige } from "@/lib/sitzung";
import { fixkostenProMonat, INTERVALLE } from "@/lib/finanzen";
import { formatDatum, formatEuro, heute } from "@/lib/format";

export default function FixkostenListe() {
  const b = useBenoetige(DARF_FINANZEN);
  const { daten, fehler } = useAbfrage(ladeFinanzen, [], !!b);
  if (!b) return null;
  if (!daten) return <Laden fehler={fehler} />;
  const alle = daten.fixkosten;
  const stichtag = heute();
  const aktiv = alle.filter((f) => f.beginn <= stichtag && (!f.ende || f.ende >= stichtag));
  const sonstige = alle.filter((f) => !aktiv.includes(f));
  const proMonat = aktiv.reduce((s, f) => s + fixkostenProMonat(f), 0);

  const tabelle = (liste: typeof alle) => (
    <table className="tabelle">
      <thead>
        <tr>
          <th>Bezeichnung</th>
          <th className="hidden md:table-cell">Kategorie</th>
          <th className="betrag">Betrag</th>
          <th className="hidden sm:table-cell">Intervall</th>
          <th className="betrag">pro Monat</th>
          <th className="hidden md:table-cell">Laufzeit</th>
        </tr>
      </thead>
      <tbody>
        {liste.map((f) => (
          <tr key={f.id} className="hover:bg-slate-50">
            <td>
              <Link className="font-medium text-marke hover:underline" href={pfad.fixkosten(f.id)}>{f.bezeichnung}</Link>
            </td>
            <td className="hidden md:table-cell">{f.kategorie}</td>
            <td className="betrag">{formatEuro(f.betragCent)}</td>
            <td className="hidden sm:table-cell">{INTERVALLE[f.intervall].name}</td>
            <td className="betrag">{formatEuro(fixkostenProMonat(f))}</td>
            <td className="hidden whitespace-nowrap md:table-cell">
              seit {formatDatum(f.beginn)}
              {f.ende && ` bis ${formatDatum(f.ende)}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <Seitenkopf
        titel="Fixkosten"
        untertitel={
          <>Aktuell <strong>{formatEuro(proMonat)}</strong> pro Monat · {formatEuro(proMonat * 12)} pro Jahr</>
        }
        aktionen={<Link className="btn-primaer" href="/finanzen/fixkosten/neu/">+ Fixkosten eintragen</Link>}
      />
      <div className="karte overflow-x-auto p-0 sm:p-0">
        {aktiv.length ? tabelle(aktiv) : <p className="p-5 text-slate-600">Noch keine laufenden Fixkosten eingetragen.</p>}
      </div>
      {sonstige.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 font-semibold text-slate-700">Beendet oder noch nicht begonnen</h2>
          <div className="karte overflow-x-auto p-0 text-slate-500 sm:p-0">{tabelle(sonstige)}</div>
        </>
      )}
    </>
  );
}
