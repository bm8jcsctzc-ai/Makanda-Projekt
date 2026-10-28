"use client";

import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import { useAbfrage } from "@/lib/daten";
import { heute } from "@/lib/format";
import { DARF_GEHAELTER } from "@/lib/rechte";
import { useBenoetige } from "@/lib/sitzung";
import { speicherePersonalkosten } from "../../aktionen";
import { ladeGehaelter } from "../daten";
import { GehaltsFormular } from "../GehaltsFormular";

export default function NeuesGehalt() {
  const b = useBenoetige(DARF_GEHAELTER);
  const { daten, fehler } = useAbfrage(ladeGehaelter, [], !!b);
  if (!b) return null;
  if (!daten) return <Laden fehler={fehler} />;
  return (
    <>
      <Seitenkopf titel="Gehalt eintragen" />
      <GehaltsFormular aktion={speicherePersonalkosten.bind(null, null)} mitarbeiterVorschlaege={daten.namen} heute={heute()} />
    </>
  );
}
