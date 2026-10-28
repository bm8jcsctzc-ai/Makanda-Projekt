import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { fixkosten } from "@/db/schema";
import { benoetigeBenutzer, DARF_FINANZEN } from "@/lib/auth";
import { heute } from "@/lib/format";
import { loescheFixkosten, speichereFixkosten } from "../actions";
import { FixkostenFormular } from "../FixkostenFormular";

export default async function FixkostenBearbeiten({ params }: { params: Promise<{ id: string }> }) {
  await benoetigeBenutzer(DARF_FINANZEN);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [f] = await db.select().from(fixkosten).where(eq(fixkosten.id, id));
  if (!f) notFound();
  return (
    <>
      <Seitenkopf
        titel="Fixkosten bearbeiten"
        untertitel="Endet ein Vertrag, trage besser ein Enddatum ein statt zu löschen – dann bleiben frühere Monate richtig."
        aktionen={<LoeschenKnopf aktion={loescheFixkosten.bind(null, id)} frage="Diesen Eintrag wirklich löschen?" />}
      />
      <FixkostenFormular aktion={speichereFixkosten.bind(null, id)} eintrag={f} heute={heute()} />
    </>
  );
}
