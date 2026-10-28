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
import { loescheFixkosten, speichereFixkosten } from "../../aktionen";
import { FixkostenFormular } from "../FixkostenFormular";

function Inhalt() {
  const b = useBenoetige(DARF_FINANZEN);
  const id = useParam("id");
  const { daten, fehler } = useAbfrage(ladeFinanzen, [], !!b);
  if (!b) return null;
  if (!daten) return <Laden fehler={fehler} />;
  const f = daten.fixkosten.find((x) => x.id === id);
  if (!f) return <NichtGefunden was="Der Eintrag" />;
  return (
    <>
      <Seitenkopf
        titel="Fixkosten bearbeiten"
        untertitel="Endet ein Vertrag, trage besser ein Enddatum ein statt zu löschen – dann bleiben frühere Monate richtig."
        aktionen={<LoeschenKnopf aktion={() => loescheFixkosten(id)} frage="Diesen Eintrag wirklich löschen?" />}
      />
      <FixkostenFormular aktion={speichereFixkosten.bind(null, id)} eintrag={f} heute={heute()} />
    </>
  );
}

export default function FixkostenBearbeiten() {
  return <Suspense><Inhalt /></Suspense>;
}
