"use client";

import { Suspense } from "react";
import { Laden, NichtGefunden } from "@/components/Laden";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import type { Kunde } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage, useParam } from "@/lib/daten";
import { pfad } from "@/lib/pfade";
import { useBenoetige } from "@/lib/sitzung";
import { DARF_PLANEN } from "@/lib/technik";
import { loescheKunde, speichereKunde } from "../aktionen";
import { KundenFormular } from "../KundenFormular";

function Inhalt() {
  const b = useBenoetige(DARF_PLANEN);
  const id = useParam("id");
  const { daten, fehler } = useAbfrage(() => api<{ kunde: Kunde } | null>("kunde", { p_id: id }), [id], !!b && !!id);
  if (!b) return null;
  if (daten === null) return <NichtGefunden was="Der Kunde" />;
  if (!daten) return <Laden fehler={fehler} />;
  const k = daten.kunde;
  return (
    <>
      <Seitenkopf
        titel="Kunde bearbeiten"
        aktionen={
          <LoeschenKnopf
            aktion={() => loescheKunde(id)}
            frage={`${k.name} mit allen Anlagen, Einsätzen, Checklisten und Fotos wirklich löschen?`}
          />
        }
      />
      <KundenFormular aktion={speichereKunde.bind(null, id)} kunde={k} zurueck={pfad.kunde(id)} />
    </>
  );
}

export default function KundeBearbeiten() {
  return <Suspense><Inhalt /></Suspense>;
}
