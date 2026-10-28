"use client";

import { Suspense } from "react";
import { Laden, NichtGefunden } from "@/components/Laden";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { api } from "@/lib/api";
import { einsatzAuswahl } from "@/lib/auswahl";
import { useAbfrage, useParam } from "@/lib/daten";
import { heute } from "@/lib/format";
import { pfad } from "@/lib/pfade";
import { useBenoetige } from "@/lib/sitzung";
import { DARF_PLANEN } from "@/lib/technik";
import type { EinsatzDetail } from "@/lib/typen";
import { loescheEinsatz, speichereEinsatz } from "../aktionen";
import { EinsatzFormular } from "../EinsatzFormular";

function Inhalt() {
  const b = useBenoetige(DARF_PLANEN);
  const id = useParam("id");
  const { daten, fehler } = useAbfrage(
    () => Promise.all([api<EinsatzDetail | null>("einsatz", { p_id: id }), einsatzAuswahl()]),
    [id],
    !!b && !!id,
  );
  if (!b) return null;
  if (!daten) return <Laden fehler={fehler} />;
  const [einsatz, auswahl] = daten;
  if (!einsatz) return <NichtGefunden was="Der Einsatz" />;
  return (
    <>
      <Seitenkopf
        titel="Einsatz bearbeiten"
        aktionen={
          <LoeschenKnopf
            aktion={() => loescheEinsatz(id)}
            frage="Diesen Einsatz mit seinen Checklisten wirklich löschen? Fotos zur Anlage bleiben erhalten."
          />
        }
      />
      <EinsatzFormular aktion={speichereEinsatz.bind(null, id)} einsatz={einsatz.e} {...auswahl} heute={heute()} zurueck={pfad.einsatz(id)} />
    </>
  );
}

export default function EinsatzBearbeiten() {
  return <Suspense><Inhalt /></Suspense>;
}
