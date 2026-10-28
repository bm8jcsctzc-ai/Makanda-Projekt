"use client";

import { Suspense } from "react";
import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import { istDatum, istUuid } from "@/lib/aktionen";
import { einsatzAuswahl } from "@/lib/auswahl";
import { useAbfrage, useParam } from "@/lib/daten";
import { heute } from "@/lib/format";
import { pfad } from "@/lib/pfade";
import { useBenoetige } from "@/lib/sitzung";
import { DARF_PLANEN } from "@/lib/technik";
import { speichereEinsatz } from "../aktionen";
import { EinsatzFormular } from "../EinsatzFormular";

function Inhalt() {
  const b = useBenoetige(DARF_PLANEN);
  const kunde = useParam("kunde");
  const anlage = useParam("anlage");
  const datum = useParam("datum");
  const { daten: auswahl, fehler } = useAbfrage(einsatzAuswahl, [], !!b);
  if (!b) return null;
  if (!auswahl) return <Laden fehler={fehler} />;
  return (
    <>
      <Seitenkopf titel="Einsatz planen" />
      {auswahl.kunden.length === 0 ? (
        <p className="karte text-slate-600">Lege zuerst unter „Kunden“ einen Kunden an.</p>
      ) : (
        <EinsatzFormular
          aktion={speichereEinsatz.bind(null, null)}
          vorauswahl={{
            kundeId: istUuid(kunde) ? kunde : undefined,
            anlageId: istUuid(anlage) ? anlage : undefined,
            datum: istDatum(datum) ? datum : undefined,
          }}
          {...auswahl}
          heute={heute()}
          zurueck={istUuid(kunde) ? pfad.kunde(kunde) : "/einsaetze/"}
        />
      )}
    </>
  );
}

export default function NeuerEinsatz() {
  return <Suspense><Inhalt /></Suspense>;
}
