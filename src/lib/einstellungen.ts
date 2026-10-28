import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { einstellungen, type Einstellungen } from "@/db/schema";

export async function ladeEinstellungen(): Promise<Einstellungen> {
  const db = await getDb();
  const [e] = await db.select().from(einstellungen).where(eq(einstellungen.id, 1));
  return e;
}
