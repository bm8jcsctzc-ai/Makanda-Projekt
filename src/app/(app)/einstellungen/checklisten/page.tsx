"use client";

import Link from "next/link";
import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import type { ChecklisteVorlage } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage } from "@/lib/daten";
import { pfad } from "@/lib/pfade";
import { ANLAGENTYPEN } from "@/lib/technik";

export default function ChecklistenVorlagen() {
  const { daten: vorlagen, fehler } = useAbfrage(() => api<ChecklisteVorlage[]>("vorlagen"), []);
  return (
    <>
      <Seitenkopf
        titel="Checklisten-Vorlagen"
        untertitel="Änderungen gelten für neue Checklisten. Bereits ausgefüllte bleiben unverändert."
        aktionen={<Link className="btn-primaer" href="/einstellungen/checklisten/neu/">+ Neue Vorlage</Link>}
      />
      {!vorlagen ? (
        <Laden fehler={fehler} />
      ) : (
        <div className="karte overflow-x-auto p-0 sm:p-0">
          <table className="tabelle">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hidden sm:table-cell">Passt zu</th>
                <th>Punkte</th>
                <th className="hidden sm:table-cell">Version</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vorlagen.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td>
                    <Link className="font-medium text-marke hover:underline" href={pfad.vorlage(v.id)}>{v.name}</Link>
                    {v.istWartung && <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-800">Wartung</span>}
                  </td>
                  <td className="hidden sm:table-cell">{v.anlagentyp ? ANLAGENTYPEN[v.anlagentyp] : "alle Anlagen"}</td>
                  <td>{v.punkte.length}</td>
                  <td className="hidden sm:table-cell">{v.version}</td>
                  <td>{v.aktiv ? "aktiv" : <span className="text-slate-400">inaktiv</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
