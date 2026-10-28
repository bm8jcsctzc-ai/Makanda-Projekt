import { getDb } from "@/db";
import { benutzer, personalkosten } from "@/db/schema";

/** Namen aus Benutzern und bisherigen Gehaltseinträgen, für die Vorschlagsliste */
export async function mitarbeiterNamen(): Promise<string[]> {
  const db = await getDb();
  const [a, b] = await Promise.all([
    db.select({ n: benutzer.name }).from(benutzer),
    db.select({ n: personalkosten.mitarbeiter }).from(personalkosten),
  ]);
  return [...new Set([...a, ...b].map((z) => z.n))].sort((x, y) => x.localeCompare(y, "de"));
}
