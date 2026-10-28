"use client";

import { Suspense } from "react";
import { Laden, NichtGefunden } from "@/components/Laden";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { useAbfrage, useParam } from "@/lib/daten";
import { heute } from "@/lib/format";
import { DARF_GEHAELTER } from "@/lib/rechte";
import { useBenoetige } from "@/lib/sitzung";
import { loeschePersonalkosten, speicherePersonalkosten } from "../../aktionen";
import { ladeGehaelter } from "../daten";
import { GehaltsFormular } from "../GehaltsFormular";

function Inhalt() {
  const b = useBenoetige(DARF_GEHAELTER);
  const id = useParam("id");
  const { daten, fehler } = useAbfrage(ladeGehaelter, [], !!b);
  if (!b) return null;
  if (!daten) return <Laden fehler={fehler} />;
  const p = daten.personal.find((x) => x.id === id);
  if (!p) return <NichtGefunden was="Der Eintrag" />;
  return (
    <>
      <Seitenkopf
        titel="Gehalt bearbeiten"
        untertitel="Bei einer Gehaltserhöhung: beim alten Eintrag „Gültig bis“ setzen und einen neuen Eintrag anlegen. So bleiben frühere Monate richtig."
        aktionen={<LoeschenKnopf aktion={() => loeschePersonalkosten(id)} frage="Diesen Gehaltseintrag wirklich löschen?" />}
      />
      <GehaltsFormular aktion={speicherePersonalkosten.bind(null, id)} eintrag={p} mitarbeiterVorschlaege={daten.namen} heute={heute()} />
    </>
  );
}

export default function GehaltBearbeiten() {
  return <Suspense><Inhalt /></Suspense>;
}
