import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { anlage } from "@/db/schema";
import { istUuid } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { DARF_PLANEN } from "@/lib/technik";
import { loescheAnlage, speichereAnlage } from "../../actions";
import { AnlagenFormular } from "../../AnlagenFormular";

export default async function AnlageBearbeiten({ params }: { params: Promise<{ id: string }> }) {
  const b = await benoetigeBenutzer();
  const { id } = await params;
  if (!istUuid(id)) notFound();
  const db = await getDb();
  const [a] = await db.select().from(anlage).where(eq(anlage.id, id));
  if (!a) notFound();
  return (
    <>
      <Seitenkopf
        titel="Anlage bearbeiten"
        aktionen={
          DARF_PLANEN.includes(b.rolle) && (
            <LoeschenKnopf aktion={loescheAnlage.bind(null, id)} frage="Diese Anlage mit allen Fotos wirklich löschen?" />
          )
        }
      />
      <AnlagenFormular aktion={speichereAnlage.bind(null, id, a.kundeId)} anlage={a} zurueck={`/anlagen/${id}`} />
    </>
  );
}
