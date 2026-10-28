"use client";

import { Seitenkopf } from "@/components/Seitenkopf";
import { useBenoetige } from "@/lib/sitzung";
import { DARF_PLANEN } from "@/lib/technik";
import { speichereKunde } from "../aktionen";
import { KundenFormular } from "../KundenFormular";

export default function NeuerKunde() {
  if (!useBenoetige(DARF_PLANEN)) return null;
  return (
    <>
      <Seitenkopf titel="Kunde anlegen" />
      <KundenFormular aktion={speichereKunde.bind(null, null)} zurueck="/kunden/" />
    </>
  );
}
