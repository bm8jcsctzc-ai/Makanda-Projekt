import { asc } from "drizzle-orm";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { benutzer } from "@/db/schema";
import { benoetigeBenutzer, DARF_BENUTZER } from "@/lib/auth";
import { benutzerAendern, benutzerAnlegen } from "./actions";
import { BenutzerZeile, NeuerBenutzer } from "./Formulare";

export default async function BenutzerVerwaltung() {
  const ich = await benoetigeBenutzer(DARF_BENUTZER);
  const db = await getDb();
  const alle = await db.select().from(benutzer).orderBy(asc(benutzer.name));
  return (
    <>
      <Seitenkopf titel="Benutzer" untertitel="Jede Person bekommt einen eigenen Zugang. Ehemalige Mitarbeiter deaktivieren statt löschen." />
      <div className="karte mb-6 py-0 sm:py-0">
        {alle.map((b) => (
          <BenutzerZeile key={b.id} benutzer={b} aktion={benutzerAendern.bind(null, b.id)} binIchSelbst={b.id === ich.id} />
        ))}
      </div>
      <NeuerBenutzer aktion={benutzerAnlegen} />
    </>
  );
}
