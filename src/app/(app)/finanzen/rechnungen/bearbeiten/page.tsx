"use client";

import { Suspense } from "react";
import { Laden, NichtGefunden } from "@/components/Laden";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { useAbfrage, useParam } from "@/lib/daten";
import { ladeFinanzen } from "@/lib/finanz-daten";
import { heute } from "@/lib/format";
import { DARF_FINANZEN } from "@/lib/rechte";
import { useBenoetige } from "@/lib/sitzung";
import { loescheRechnung, speichereRechnung } from "../../aktionen";
import { RechnungsFormular } from "../RechnungsFormular";

function Inhalt() {
  const b = useBenoetige(DARF_FINANZEN);
  const id = useParam("id");
  const { daten, fehler } = useAbfrage(ladeFinanzen, [], !!b);
  if (!b) return null;
  if (!daten) return <Laden fehler={fehler} />;
  const r = daten.rechnungen.find((x) => x.id === id);
  if (!r) return <NichtGefunden was="Die Rechnung" />;
  return (
    <>
      <Seitenkopf
        titel="Rechnung bearbeiten"
        aktionen={<LoeschenKnopf aktion={() => loescheRechnung(id)} frage="Diese Rechnung und die hochgeladene Datei wirklich löschen?" />}
      />
      <RechnungsFormular
        aktion={speichereRechnung.bind(null, id)}
        rechnung={r}
        dateiName={r.dateiName}
        dateiPfad={r.dateiPfad}
        lieferanten={[...new Set(daten.rechnungen.map((x) => x.lieferant))].sort((x, y) => x.localeCompare(y, "de"))}
        heute={heute()}
      />
    </>
  );
}

export default function RechnungBearbeiten() {
  return <Suspense><Inhalt /></Suspense>;
}
