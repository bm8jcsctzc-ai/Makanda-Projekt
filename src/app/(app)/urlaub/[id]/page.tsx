import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Konflikte } from "@/components/Konflikte";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { Angaben } from "@/components/Status";
import { getDb } from "@/db";
import { abwesenheit, benutzer } from "@/db/schema";
import { istUuid } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { formatDatum, formatDatumZeit } from "@/lib/format";
import { ARTEN, arbeitstage, DARF_EINTRAGEN, DARF_GENEHMIGEN, formatTage, STATUS } from "@/lib/urlaub";
import { bundesland, ladeKonflikte, ladeTeam } from "@/lib/urlaub-daten";
import { abwesenheitLoeschen, entscheiden } from "../actions";
import { EntscheidungFormular } from "../Formulare";

export default async function AbwesenheitSeite({ params }: { params: Promise<{ id: string }> }) {
  const b = await benoetigeBenutzer();
  const { id } = await params;
  if (!istUuid(id)) notFound();
  const db = await getDb();
  const [zeile] = await db
    .select({ a: abwesenheit, name: benutzer.name })
    .from(abwesenheit)
    .innerJoin(benutzer, eq(abwesenheit.benutzerId, benutzer.id))
    .where(eq(abwesenheit.id, id));
  if (!zeile) notFound();
  const { a, name } = zeile;
  const verwaltet = DARF_EINTRAGEN.includes(b.rolle);
  // Monteure sehen nur ihre eigenen Einträge
  if (!verwaltet && a.benutzerId !== b.id) redirect("/urlaub");

  const [land, team, konflikte] = await Promise.all([bundesland(), ladeTeam(), ladeKonflikte(a)]);
  const kannLoeschen = verwaltet || (a.benutzerId === b.id && a.status === "beantragt");

  return (
    <>
      <Seitenkopf
        titel={`${ARTEN[a.art].name}: ${name}`}
        untertitel={<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[a.status].klasse}`}>{STATUS[a.status].text}</span>}
        aktionen={
          kannLoeschen && (
            <LoeschenKnopf
              aktion={abwesenheitLoeschen.bind(null, id)}
              frage={a.status === "beantragt" && a.benutzerId === b.id ? "Antrag zurückziehen?" : "Diesen Eintrag löschen?"}
              text={a.status === "beantragt" && a.benutzerId === b.id ? "Antrag zurückziehen" : "Löschen"}
            />
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="karte">
          <Angaben
            werte={[
              ["Zeitraum", a.von === a.bis ? formatDatum(a.von) : `${formatDatum(a.von)} – ${formatDatum(a.bis)}`],
              ["Dauer", `${formatTage(arbeitstage(a, land))}${a.halbtags ? " (halber Tag)" : ""}`],
              ["Bemerkung", a.bemerkung],
              ["Entschieden", a.entschiedenAm && formatDatumZeit(a.entschiedenAm)],
              ["Kommentar", a.entscheidungKommentar],
            ]}
          />
        </section>
        {(verwaltet || a.status === "beantragt") && (
          <section className="karte space-y-3">
            <h2 className="font-semibold">Überschneidungen</h2>
            <Konflikte konflikte={konflikte} teamGroesse={team.length} />
            {a.status === "beantragt" && DARF_GENEHMIGEN.includes(b.rolle) && (
              <EntscheidungFormular genehmigen={entscheiden.bind(null, id, true)} ablehnen={entscheiden.bind(null, id, false)} />
            )}
          </section>
        )}
      </div>
    </>
  );
}
