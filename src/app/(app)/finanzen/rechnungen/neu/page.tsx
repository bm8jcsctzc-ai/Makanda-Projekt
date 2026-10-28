"use client";

import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import { useAbfrage } from "@/lib/daten";
import { ladeFinanzen } from "@/lib/finanz-daten";
import { heute } from "@/lib/format";
import { DARF_FINANZEN } from "@/lib/rechte";
import { useBenoetige } from "@/lib/sitzung";
import { speichereRechnung } from "../../aktionen";
import { RechnungsFormular } from "../RechnungsFormular";

export default function NeueRechnung() {
  const b = useBenoetige(DARF_FINANZEN);
  const { daten, fehler } = useAbfrage(ladeFinanzen, [], !!b);
  if (!b) return null;
  if (!daten) return <Laden fehler={fehler} />;
  return (
    <>
      <Seitenkopf titel="Rechnung erfassen" untertitel="Felder mit * sind Pflicht." />
      <RechnungsFormular
        aktion={speichereRechnung.bind(null, null)}
        lieferanten={[...new Set(daten.rechnungen.map((r) => r.lieferant))].sort((x, y) => x.localeCompare(y, "de"))}
        heute={heute()}
      />
    </>
  );
}
