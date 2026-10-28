import { count } from "drizzle-orm";
import { getDb } from "@/db";
import { benutzer } from "@/db/schema";

export async function gibtEsBenutzer(): Promise<boolean> {
  const db = await getDb();
  const [{ anzahl }] = await db.select({ anzahl: count() }).from(benutzer);
  return anzahl > 0;
}

export const MIN_PASSWORT_LAENGE = 10;
