import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { kunde } from "@/db/schema";
import { istUuid } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { speichereAnlage } from "../actions";
import { AnlagenFormular } from "../AnlagenFormular";

export default async function NeueAnlage({ searchParams }: { searchParams: Promise<{ kunde?: string }> }) {
  await benoetigeBenutzer();
  const { kunde: kundeId } = await searchParams;
  if (!istUuid(kundeId)) notFound();
  const db = await getDb();
  const [k] = await db.select().from(kunde).where(eq(kunde.id, kundeId));
  if (!k) notFound();
  return (
    <>
      <Seitenkopf titel="Anlage erfassen" untertitel={`bei ${k.name}`} />
      <AnlagenFormular aktion={speichereAnlage.bind(null, null, k.id)} zurueck={`/kunden/${k.id}`} />
    </>
  );
}
