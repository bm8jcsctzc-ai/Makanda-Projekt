"use client";

import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import { api } from "@/lib/api";
import { useAbfrage } from "@/lib/daten";
import { heute } from "@/lib/format";
import { useBenoetige } from "@/lib/sitzung";
import type { TeamMitglied } from "@/lib/typen";
import { DARF_EINTRAGEN } from "@/lib/urlaub";
import { bundesland } from "@/lib/urlaub-daten";
import { abwesenheitEintragen } from "../aktionen";
import { AbwesenheitFormular } from "../Formulare";

export default function NeueAbwesenheit() {
  const b = useBenoetige();
  const fuerAlle = !!b && DARF_EINTRAGEN.includes(b.rolle);
  const { daten, fehler } = useAbfrage(
    () => Promise.all([bundesland(), fuerAlle ? api<TeamMitglied[]>("team") : Promise.resolve(null)]),
    [fuerAlle],
    !!b,
  );
  if (!b) return null;
  if (!daten) return <Laden fehler={fehler} />;
  const [land, team] = daten;
  return (
    <>
      <Seitenkopf
        titel={fuerAlle ? "Abwesenheit eintragen" : "Urlaub beantragen"}
        untertitel={fuerAlle ? "Urlaub, Krankheit, Berufsschule – für dich oder einen Mitarbeiter." : "Der Antrag geht an den Inhaber zur Genehmigung."}
      />
      <AbwesenheitFormular
        aktion={abwesenheitEintragen.bind(null, land)}
        mitarbeiter={team ? team.filter((m) => m.imTeam || m.id === b.id).map((m) => ({ id: m.id, name: m.name })) : null}
        ichId={b.id}
        land={land}
        heute={heute()}
      />
    </>
  );
}
