import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { checklisteVorlage } from "@/db/schema";
import { istUuid } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { DARF_PLANEN } from "@/lib/technik";
import { loescheVorlage, speichereVorlage } from "../actions";
import { VorlagenEditor } from "../VorlagenEditor";

export default async function VorlageBearbeiten({ params }: { params: Promise<{ id: string }> }) {
  await benoetigeBenutzer(DARF_PLANEN);
  const { id } = await params;
  if (!istUuid(id)) notFound();
  const db = await getDb();
  const [v] = await db.select().from(checklisteVorlage).where(eq(checklisteVorlage.id, id));
  if (!v) notFound();
  return (
    <>
      <Seitenkopf
        titel="Vorlage bearbeiten"
        untertitel={`Version ${v.version}`}
        aktionen={<LoeschenKnopf aktion={loescheVorlage.bind(null, id)} frage="Vorlage löschen? Bereits ausgefüllte Checklisten bleiben erhalten. Tipp: Statt löschen kann man sie auch inaktiv setzen." />}
      />
      <VorlagenEditor
        start={{ name: v.name, anlagentyp: v.anlagentyp, istWartung: v.istWartung, aktiv: v.aktiv, punkte: v.punkte }}
        speichern={speichereVorlage.bind(null, id)}
      />
    </>
  );
}
