"use client";

import { Suspense } from "react";
import { Laden, NichtGefunden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import type { Kunde } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage, useParam } from "@/lib/daten";
import { pfad } from "@/lib/pfade";
import { useBenoetige } from "@/lib/sitzung";
import { speichereAnlage } from "../aktionen";
import { AnlagenFormular } from "../AnlagenFormular";

function Inhalt() {
  const b = useBenoetige();
  const kundeId = useParam("kunde");
  const { daten, fehler } = useAbfrage(() => api<{ kunde: Kunde } | null>("kunde", { p_id: kundeId }), [kundeId], !!b && !!kundeId);
  if (!b) return null;
  if (daten === null || !kundeId) return <NichtGefunden was="Der Kunde" />;
  if (!daten) return <Laden fehler={fehler} />;
  return (
    <>
      <Seitenkopf titel="Anlage erfassen" untertitel={`bei ${daten.kunde.name}`} />
      <AnlagenFormular aktion={speichereAnlage.bind(null, null, kundeId)} zurueck={pfad.kunde(kundeId)} />
    </>
  );
}

export default function NeueAnlage() {
  return <Suspense><Inhalt /></Suspense>;
}
