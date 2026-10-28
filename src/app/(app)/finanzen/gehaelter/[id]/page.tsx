import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { personalkosten } from "@/db/schema";
import { benoetigeBenutzer, DARF_GEHAELTER } from "@/lib/auth";
import { heute } from "@/lib/format";
import { loeschePersonalkosten, speicherePersonalkosten } from "../actions";
import { mitarbeiterNamen } from "../daten";
import { GehaltsFormular } from "../GehaltsFormular";

export default async function GehaltBearbeiten({ params }: { params: Promise<{ id: string }> }) {
  await benoetigeBenutzer(DARF_GEHAELTER);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [p] = await db.select().from(personalkosten).where(eq(personalkosten.id, id));
  if (!p) notFound();
  return (
    <>
      <Seitenkopf
        titel="Gehalt bearbeiten"
        untertitel="Bei einer Gehaltserhöhung: beim alten Eintrag „Gültig bis“ setzen und einen neuen Eintrag anlegen. So bleiben frühere Monate richtig."
        aktionen={<LoeschenKnopf aktion={loeschePersonalkosten.bind(null, id)} frage="Diesen Gehaltseintrag wirklich löschen?" />}
      />
      <GehaltsFormular
        aktion={speicherePersonalkosten.bind(null, id)}
        eintrag={p}
        mitarbeiterVorschlaege={await mitarbeiterNamen()}
        heute={heute()}
      />
    </>
  );
}
