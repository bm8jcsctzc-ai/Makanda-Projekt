import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { einsatz } from "@/db/schema";
import { istUuid } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { einsatzAuswahl } from "@/lib/auswahl";
import { heute } from "@/lib/format";
import { DARF_PLANEN } from "@/lib/technik";
import { loescheEinsatz, speichereEinsatz } from "../../actions";
import { EinsatzFormular } from "../../EinsatzFormular";

export default async function EinsatzBearbeiten({ params }: { params: Promise<{ id: string }> }) {
  await benoetigeBenutzer(DARF_PLANEN);
  const { id } = await params;
  if (!istUuid(id)) notFound();
  const db = await getDb();
  const [e] = await db.select().from(einsatz).where(eq(einsatz.id, id));
  if (!e) notFound();
  return (
    <>
      <Seitenkopf
        titel="Einsatz bearbeiten"
        aktionen={<LoeschenKnopf aktion={loescheEinsatz.bind(null, id)} frage="Diesen Einsatz mit seinen Checklisten wirklich löschen? Fotos zur Anlage bleiben erhalten." />}
      />
      <EinsatzFormular aktion={speichereEinsatz.bind(null, id)} einsatz={e} {...await einsatzAuswahl()} heute={heute()} zurueck={`/einsaetze/${id}`} />
    </>
  );
}
