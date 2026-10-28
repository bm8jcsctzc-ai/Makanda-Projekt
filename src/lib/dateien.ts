import { randomUUID } from "node:crypto";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { datei } from "@/db/schema";
import { aktuellerSpeicher } from "./speicher";

// Wo die Dateien liegen (Supabase Storage oder Ordner), regelt ./speicher.ts.

// Kein SVG: das könnte Skripte enthalten
const BILD_TYPEN = ["image/jpeg", "image/png", "image/heic", "image/webp"];
export const ERLAUBTE_TYPEN = ["application/pdf", ...BILD_TYPEN];
// Vercel nimmt pro Anfrage höchstens 4,5 MB an. Fotos werden schon im Browser verkleinert.
export const MAX_GROESSE = 4 * 1024 * 1024;

export class DateiFehler extends Error {}

export type Bereich = "finanzen" | "technik";

/** Speichert eine hochgeladene Datei und gibt die ID des Datensatzes zurück. Leere Felder ergeben null. */
export async function speichereDatei(
  f: File | null,
  benutzerId: string,
  bereich: Bereich = "finanzen",
): Promise<string | null> {
  if (!f || f.size === 0) return null;
  if (bereich === "technik" ? !BILD_TYPEN.includes(f.type) : !ERLAUBTE_TYPEN.includes(f.type)) {
    throw new DateiFehler(
      bereich === "technik" ? "Hier sind nur Fotos erlaubt." : "Nur PDF oder Fotos (JPG, PNG, HEIC, WebP) sind erlaubt.",
    );
  }
  if (f.size > MAX_GROESSE) {
    throw new DateiFehler("Die Datei ist größer als 4 MB. Bitte als kleinere PDF speichern oder ein Foto machen.");
  }

  const jetzt = new Date();
  const endung = path.extname(f.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
  const relativ = [
    bereich,
    String(jetzt.getFullYear()),
    String(jetzt.getMonth() + 1).padStart(2, "0"),
    `${randomUUID()}${endung}`,
  ].join("/");
  await aktuellerSpeicher().schreiben(relativ, Buffer.from(await f.arrayBuffer()), f.type);

  const db = await getDb();
  const [neu] = await db
    .insert(datei)
    .values({
      originalName: f.name,
      mimeType: f.type,
      groesse: f.size,
      speicherPfad: relativ,
      bereich,
      hochgeladenVon: benutzerId,
    })
    .returning({ id: datei.id });
  return neu.id;
}

export async function ladeDatei(id: string) {
  const db = await getDb();
  const [eintrag] = await db.select().from(datei).where(eq(datei.id, id));
  if (!eintrag) return null;
  const inhalt = await aktuellerSpeicher().lesen(eintrag.speicherPfad);
  return { eintrag, inhalt };
}

export async function loescheDatei(id: string) {
  const db = await getDb();
  const [eintrag] = await db.delete(datei).where(eq(datei.id, id)).returning();
  // Fehlt die Datei im Speicher schon, ist das kein Problem – der Eintrag ist weg
  if (eintrag) await aktuellerSpeicher().loeschen(eintrag.speicherPfad).catch((e) => console.error(e));
}
