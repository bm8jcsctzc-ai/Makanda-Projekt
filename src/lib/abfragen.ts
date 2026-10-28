import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { rechnung } from "@/db/schema";

/** Alle bisher verwendeten Lieferanten, für die Vorschlagsliste im Formular */
export async function bekannteLieferanten(): Promise<string[]> {
  const db = await getDb();
  const zeilen = await db
    .selectDistinct({ lieferant: rechnung.lieferant })
    .from(rechnung)
    .orderBy(asc(rechnung.lieferant));
  return zeilen.map((z) => z.lieferant);
}
