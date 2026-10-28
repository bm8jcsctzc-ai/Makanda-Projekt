import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { datei, rechnung } from "@/db/schema";
import { bekannteLieferanten } from "@/lib/abfragen";
import { benoetigeBenutzer, DARF_FINANZEN } from "@/lib/auth";
import { heute } from "@/lib/format";
import { loescheRechnung, speichereRechnung } from "../actions";
import { RechnungsFormular } from "../RechnungsFormular";

export default async function RechnungBearbeiten({ params }: { params: Promise<{ id: string }> }) {
  await benoetigeBenutzer(DARF_FINANZEN);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [zeile] = await db
    .select({ r: rechnung, dateiName: datei.originalName })
    .from(rechnung)
    .leftJoin(datei, eq(rechnung.dateiId, datei.id))
    .where(eq(rechnung.id, id));
  if (!zeile) notFound();

  return (
    <>
      <Seitenkopf
        titel="Rechnung bearbeiten"
        aktionen={
          <LoeschenKnopf
            aktion={loescheRechnung.bind(null, id)}
            frage="Diese Rechnung und die hochgeladene Datei wirklich löschen?"
          />
        }
      />
      <RechnungsFormular
        aktion={speichereRechnung.bind(null, id)}
        rechnung={zeile.r}
        dateiName={zeile.dateiName}
        lieferanten={await bekannteLieferanten()}
        heute={heute()}
      />
    </>
  );
}
