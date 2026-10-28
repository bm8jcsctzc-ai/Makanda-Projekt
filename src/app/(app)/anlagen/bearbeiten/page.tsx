"use client";

import { Suspense } from "react";
import { Laden, NichtGefunden } from "@/components/Laden";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import type { Anlage } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage, useParam } from "@/lib/daten";
import { pfad } from "@/lib/pfade";
import { useBenoetige } from "@/lib/sitzung";
import { DARF_PLANEN } from "@/lib/technik";
import { loescheAnlage, speichereAnlage } from "../aktionen";
import { AnlagenFormular } from "../AnlagenFormular";

function Inhalt() {
  const b = useBenoetige();
  const id = useParam("id");
  const { daten, fehler } = useAbfrage(() => api<{ anlage: Anlage } | null>("anlage", { p_id: id }), [id], !!b && !!id);
  if (!b) return null;
  if (daten === null) return <NichtGefunden was="Die Anlage" />;
  if (!daten) return <Laden fehler={fehler} />;
  const a = daten.anlage;
  return (
    <>
      <Seitenkopf
        titel="Anlage bearbeiten"
        aktionen={
          DARF_PLANEN.includes(b.rolle) && (
            <LoeschenKnopf aktion={() => loescheAnlage(id)} frage="Diese Anlage mit allen Fotos wirklich löschen?" />
          )
        }
      />
      <AnlagenFormular aktion={speichereAnlage.bind(null, id, a.kundeId)} anlage={a} zurueck={pfad.anlage(id)} />
    </>
  );
}

export default function AnlageBearbeiten() {
  return <Suspense><Inhalt /></Suspense>;
}
