import { Seitenkopf } from "@/components/Seitenkopf";
import { benoetigeBenutzer } from "@/lib/auth";
import { heute } from "@/lib/format";
import { DARF_EINTRAGEN } from "@/lib/urlaub";
import { bundesland, ladeTeam } from "@/lib/urlaub-daten";
import { abwesenheitEintragen } from "../actions";
import { AbwesenheitFormular } from "../Formulare";

export default async function NeueAbwesenheit() {
  const b = await benoetigeBenutzer();
  const fuerAlle = DARF_EINTRAGEN.includes(b.rolle);
  const team = fuerAlle ? await ladeTeam() : null;
  return (
    <>
      <Seitenkopf
        titel={fuerAlle ? "Abwesenheit eintragen" : "Urlaub beantragen"}
        untertitel={fuerAlle ? "Urlaub, Krankheit, Berufsschule – für dich oder einen Mitarbeiter." : "Der Antrag geht an den Inhaber zur Genehmigung."}
      />
      <AbwesenheitFormular
        aktion={abwesenheitEintragen}
        mitarbeiter={team?.map((m) => ({ id: m.id, name: m.name })) ?? null}
        ichId={b.id}
        land={await bundesland()}
        heute={heute()}
      />
    </>
  );
}
