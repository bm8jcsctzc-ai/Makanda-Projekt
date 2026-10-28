"use client";

import { Suspense } from "react";
import { Konflikte, type KonfliktDaten } from "@/components/Konflikte";
import { Laden, NichtGefunden } from "@/components/Laden";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { Angaben } from "@/components/Status";
import type { Abwesenheit } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage, useParam } from "@/lib/daten";
import { formatDatum, formatDatumZeit } from "@/lib/format";
import { useBenoetige } from "@/lib/sitzung";
import { ARTEN, arbeitstage, DARF_EINTRAGEN, DARF_GENEHMIGEN, formatTage, STATUS } from "@/lib/urlaub";
import { bundesland } from "@/lib/urlaub-daten";
import { entscheiden } from "../aktionen";
import { EntscheidungFormular } from "../Formulare";

type Daten = KonfliktDaten & { a: Abwesenheit; name: string; teamGroesse: number };

function Inhalt() {
  const b = useBenoetige();
  const id = useParam("id");
  const { daten, fehler, neuLaden } = useAbfrage(
    () => Promise.all([api<Daten | null>("abwesenheit", { p_id: id }), bundesland()]),
    [id],
    !!b && !!id,
  );
  if (!b) return null;
  if (!daten) return <Laden fehler={fehler} />;
  const [d, land] = daten;
  if (!d) return <NichtGefunden was="Der Eintrag" />;
  const { a, name } = d;
  const verwaltet = DARF_EINTRAGEN.includes(b.rolle);
  const eigenerAntrag = a.status === "beantragt" && a.benutzerId === b.id;

  return (
    <>
      <Seitenkopf
        titel={`${ARTEN[a.art].name}: ${name}`}
        untertitel={<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[a.status].klasse}`}>{STATUS[a.status].text}</span>}
        aktionen={
          (verwaltet || eigenerAntrag) && (
            <LoeschenKnopf
              aktion={async () => {
                await api("abwesenheit_loeschen", { p_id: id });
                return "/urlaub/";
              }}
              frage={eigenerAntrag ? "Antrag zurückziehen?" : "Diesen Eintrag löschen?"}
              text={eigenerAntrag ? "Antrag zurückziehen" : "Löschen"}
            />
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="karte">
          <Angaben
            werte={[
              ["Zeitraum", a.von === a.bis ? formatDatum(a.von) : `${formatDatum(a.von)} – ${formatDatum(a.bis)}`],
              ["Dauer", `${formatTage(arbeitstage(a, land))}${a.halbtags ? " (halber Tag)" : ""}`],
              ["Bemerkung", a.bemerkung],
              ["Entschieden", a.entschiedenAm && formatDatumZeit(a.entschiedenAm)],
              ["Kommentar", a.entscheidungKommentar],
            ]}
          />
        </section>
        {(verwaltet || a.status === "beantragt") && (
          <section className="karte space-y-3">
            <h2 className="font-semibold">Überschneidungen</h2>
            <Konflikte konflikte={d} teamGroesse={d.teamGroesse} />
            {a.status === "beantragt" && DARF_GENEHMIGEN.includes(b.rolle) && (
              <EntscheidungFormular genehmigen={entscheiden.bind(null, id, true)} ablehnen={entscheiden.bind(null, id, false)} fertig={neuLaden} />
            )}
          </section>
        )}
      </div>
    </>
  );
}

export default function AbwesenheitSeite() {
  return <Suspense><Inhalt /></Suspense>;
}
