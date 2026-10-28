"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import type { Kunde } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage, useParam } from "@/lib/daten";
import { formatDatum } from "@/lib/format";
import { pfad } from "@/lib/pfade";
import { useBenoetige } from "@/lib/sitzung";
import { adresse, DARF_PLANEN } from "@/lib/technik";

type KundeInListe = Kunde & { anlagen: number; naechsteWartung: string | null };

function Inhalt() {
  const b = useBenoetige();
  const startSuche = useParam("q");
  const [suche, setSuche] = useState(startSuche);
  const [aktiv, setAktiv] = useState(startSuche);
  const { daten: liste, fehler } = useAbfrage(() => api<KundeInListe[]>("kunden", { p_suche: aktiv || null }), [aktiv], !!b);
  if (!b) return null;

  return (
    <>
      <Seitenkopf
        titel="Kunden"
        aktionen={DARF_PLANEN.includes(b.rolle) && <Link className="btn-primaer" href="/kunden/neu/">+ Kunde anlegen</Link>}
      />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setAktiv(suche.trim());
        }}
      >
        <input className="eingabe" type="search" name="q" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Suchen nach Name, Ort, Straße, Kundennummer" aria-label="Suche" />
        <button className="btn">Suchen</button>
      </form>
      {!liste ? (
        <Laden fehler={fehler} />
      ) : (
        <div className="karte overflow-x-auto p-0 sm:p-0">
          {liste.length === 0 ? (
            <p className="p-5 text-slate-600">{aktiv ? "Kein Kunde gefunden." : "Noch keine Kunden angelegt."}</p>
          ) : (
            <table className="tabelle">
              <thead>
                <tr>
                  <th>Kunde</th>
                  <th className="hidden sm:table-cell">Adresse</th>
                  <th className="hidden md:table-cell">Anlagen</th>
                  <th>Nächste Wartung</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50">
                    <td>
                      <Link className="font-medium text-marke hover:underline" href={pfad.kunde(k.id)}>{k.name}</Link>
                      <div className="text-xs text-slate-500 sm:hidden">{k.ort}</div>
                    </td>
                    <td className="hidden sm:table-cell">{adresse(k) || "–"}</td>
                    <td className="hidden md:table-cell">{k.anlagen}</td>
                    <td className="whitespace-nowrap">{formatDatum(k.naechsteWartung)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}

export default function Kunden() {
  return <Suspense><Inhalt /></Suspense>;
}
