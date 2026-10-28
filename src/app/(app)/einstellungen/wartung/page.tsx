"use client";

import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import type { Einstellungen } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage } from "@/lib/daten";
import { speichereEinstellungen } from "../aktionen";
import { EinstellungsFormular } from "./EinstellungsFormular";

export default function WartungsEinstellungen() {
  const { daten, fehler } = useAbfrage(() => api<Einstellungen>("einstellungen"), []);
  return (
    <>
      <Seitenkopf titel="Betrieb & E-Mails" />
      {daten ? <EinstellungsFormular aktion={speichereEinstellungen} werte={daten} /> : <Laden fehler={fehler} />}
    </>
  );
}
