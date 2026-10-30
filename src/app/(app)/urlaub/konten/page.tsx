"use client";

import { Suspense, useState } from "react";
import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import type { Abwesenheit, Urlaubskonto } from "@/db/schema";
import { api, fehlertext } from "@/lib/api";
import { useAbfrage, useParam } from "@/lib/daten";
import { heute } from "@/lib/format";
import { herunterladen } from "@/lib/herunterladen";
import { useBenoetige } from "@/lib/sitzung";
import type { AbwesenheitImKalender, TeamMitglied } from "@/lib/typen";
import { DARF_GENEHMIGEN, formatTage, konto } from "@/lib/urlaub";
import { bundesland } from "@/lib/urlaub-daten";
import { kontoSpeichern } from "../aktionen";
import { KontoFormular } from "../Formulare";

function Inhalt() {
  const b = useBenoetige(DARF_GENEHMIGEN);
  const start = useParam("jahr");
  const [jahr, setJahr] = useState(/^\d{4}$/.test(start) ? Number(start) : Number(heute().slice(0, 4)));
  const [excel, setExcel] = useState<{ laeuft?: boolean; fehler?: string }>({});
  const { daten, fehler, neuLaden } = useAbfrage(
    () =>
      Promise.all([
        bundesland(),
        api<TeamMitglied[]>("team"),
        api<{ konten: Urlaubskonto[]; urlaub: Abwesenheit[] }>("urlaubskonten", { p_jahr: jahr }),
      ]),
    [jahr],
    !!b,
  );
  if (!b) return null;
  if (!daten) return <Laden fehler={fehler} />;
  const [land, team, { konten, urlaub }] = daten;

  async function excelErstellen() {
    setExcel({ laeuft: true });
    try {
      const abwesenheiten = await api<AbwesenheitImKalender[]>("abwesenheiten", { p_von: `${jahr}-01-01`, p_bis: `${jahr}-12-31` });
      const { urlaubsExcel } = await import("@/lib/urlaub-excel");
      herunterladen(await urlaubsExcel({ jahr, land, team, konten, urlaub, abwesenheiten }), `Urlaub_${jahr}.xlsx`);
      setExcel({});
    } catch (err) {
      setExcel({ fehler: fehlertext(err) });
    }
  }

  return (
    <>
      <Seitenkopf
        titel={`Urlaubskonten ${jahr}`}
        untertitel="Anspruch + Übertrag aus dem Vorjahr. Halbe Tage sind möglich (z. B. 2,5)."
        aktionen={
          <>
            <button className="btn" onClick={() => setJahr(jahr - 1)}>‹ {jahr - 1}</button>
            <button className="btn" onClick={() => setJahr(jahr + 1)}>{jahr + 1} ›</button>
            <button className="btn-primaer" onClick={excelErstellen} disabled={excel.laeuft}>
              {excel.laeuft ? "Erstelle …" : `⬇ Excel ${jahr}`}
            </button>
          </>
        }
      />
      {excel.fehler && <p className="fehler-box mb-4">{excel.fehler}</p>}
      <div className="karte overflow-x-auto p-0 sm:p-0">
        <table className="tabelle">
          <thead>
            <tr>
              <th>Mitarbeiter</th>
              <th>Anspruch + Übertrag</th>
              <th className="betrag">Genehmigt</th>
              <th className="betrag">Beantragt</th>
              <th className="betrag">Rest</th>
            </tr>
          </thead>
          <tbody>
            {team
              .filter((m) => m.imTeam)
              .map((m) => {
                const eintrag = konten.find((k) => k.benutzerId === m.id);
                const anspruch = eintrag?.anspruchTage ?? m.urlaubstageProJahr;
                const uebertragHalbe = eintrag?.uebertragHalbeTage ?? 0;
                const k = konto(urlaub.filter((u) => u.benutzerId === m.id), jahr, anspruch, uebertragHalbe, land);
                return (
                  <tr key={`${m.id}-${jahr}`}>
                    <td className="font-medium">{m.name}</td>
                    <td>
                      <KontoFormular aktion={kontoSpeichern.bind(null, m.id, jahr)} anspruch={anspruch} uebertrag={uebertragHalbe / 2} fertig={neuLaden} />
                    </td>
                    <td className="betrag">{formatTage(k.genehmigt)}</td>
                    <td className="betrag">{formatTage(k.beantragt)}</td>
                    <td className={`betrag font-semibold ${k.rest < 0 ? "text-red-700" : ""}`}>{formatTage(k.rest)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Urlaubskonten() {
  return <Suspense><Inhalt /></Suspense>;
}
