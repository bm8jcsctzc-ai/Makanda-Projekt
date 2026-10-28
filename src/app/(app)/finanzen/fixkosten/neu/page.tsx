"use client";

import { Seitenkopf } from "@/components/Seitenkopf";
import { heute } from "@/lib/format";
import { DARF_FINANZEN } from "@/lib/rechte";
import { useBenoetige } from "@/lib/sitzung";
import { speichereFixkosten } from "../../aktionen";
import { FixkostenFormular } from "../FixkostenFormular";

export default function NeueFixkosten() {
  if (!useBenoetige(DARF_FINANZEN)) return null;
  return (
    <>
      <Seitenkopf titel="Fixkosten eintragen" untertitel="Regelmäßige Kosten wie Miete, Leasing, Versicherungen, Software." />
      <FixkostenFormular aktion={speichereFixkosten.bind(null, null)} heute={heute()} />
    </>
  );
}
