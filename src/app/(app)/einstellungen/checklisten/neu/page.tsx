"use client";

import { Seitenkopf } from "@/components/Seitenkopf";
import { speichereVorlage } from "../../aktionen";
import { VorlagenEditor } from "../VorlagenEditor";

export default function NeueVorlage() {
  return (
    <>
      <Seitenkopf titel="Neue Checklisten-Vorlage" />
      <VorlagenEditor
        start={{ name: "", anlagentyp: null, istWartung: false, aktiv: true, punkte: [{ id: "p1", text: "", typ: "pruefung", pflicht: true }] }}
        speichern={speichereVorlage.bind(null, null)}
      />
    </>
  );
}
