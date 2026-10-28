"use client";

import { Suspense } from "react";
import { Laden, NichtGefunden } from "@/components/Laden";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import type { ChecklisteVorlage } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage, useParam } from "@/lib/daten";
import { loescheVorlage, speichereVorlage } from "../../aktionen";
import { VorlagenEditor } from "../VorlagenEditor";

function Inhalt() {
  const id = useParam("id");
  const { daten, fehler } = useAbfrage(() => api<ChecklisteVorlage[]>("vorlagen"), []);
  if (!daten) return <Laden fehler={fehler} />;
  const v = daten.find((x) => x.id === id);
  if (!v) return <NichtGefunden was="Die Vorlage" />;
  return (
    <>
      <Seitenkopf
        titel="Vorlage bearbeiten"
        untertitel={`Version ${v.version}`}
        aktionen={<LoeschenKnopf aktion={() => loescheVorlage(id)} frage="Vorlage löschen? Bereits ausgefüllte Checklisten bleiben erhalten. Tipp: Statt löschen kann man sie auch inaktiv setzen." />}
      />
      <VorlagenEditor
        key={v.id}
        start={{ name: v.name, anlagentyp: v.anlagentyp, istWartung: v.istWartung, aktiv: v.aktiv, punkte: v.punkte }}
        speichern={speichereVorlage.bind(null, id)}
      />
    </>
  );
}

export default function VorlageBearbeiten() {
  return <Suspense><Inhalt /></Suspense>;
}
