import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { kunde } from "@/db/schema";
import { istUuid } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { DARF_PLANEN } from "@/lib/technik";
import { loescheKunde, speichereKunde } from "../../actions";
import { KundenFormular } from "../../KundenFormular";

export default async function KundeBearbeiten({ params }: { params: Promise<{ id: string }> }) {
  await benoetigeBenutzer(DARF_PLANEN);
  const { id } = await params;
  if (!istUuid(id)) notFound();
  const db = await getDb();
  const [k] = await db.select().from(kunde).where(eq(kunde.id, id));
  if (!k) notFound();
  return (
    <>
      <Seitenkopf
        titel="Kunde bearbeiten"
        aktionen={
          <LoeschenKnopf
            aktion={loescheKunde.bind(null, id)}
            frage={`${k.name} mit allen Anlagen, Einsätzen, Checklisten und Fotos wirklich löschen?`}
          />
        }
      />
      <KundenFormular aktion={speichereKunde.bind(null, id)} kunde={k} zurueck={`/kunden/${id}`} />
    </>
  );
}
