import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { anlage, benutzer, kunde } from "@/db/schema";
import { anlagenName } from "./technik";

/** Auswahllisten für das Einsatz-Formular */
export async function einsatzAuswahl() {
  const db = await getDb();
  const [kunden, anlagen, mitarbeiter] = await Promise.all([
    db.select({ id: kunde.id, name: kunde.name, ort: kunde.ort }).from(kunde).orderBy(asc(kunde.name)),
    db.select().from(anlage).orderBy(asc(anlage.erstelltAm)),
    db.select({ id: benutzer.id, name: benutzer.name }).from(benutzer).where(eq(benutzer.aktiv, true)).orderBy(asc(benutzer.name)),
  ]);
  return {
    kunden: kunden.map((k) => ({ id: k.id, name: k.ort ? `${k.name} (${k.ort})` : k.name })),
    anlagen: anlagen.map((a) => ({ id: a.id, kundeId: a.kundeId, name: anlagenName(a) })),
    mitarbeiter,
  };
}
