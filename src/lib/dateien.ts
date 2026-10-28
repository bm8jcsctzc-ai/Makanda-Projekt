import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { datei } from "@/db/schema";

// Dateien liegen vorerst im Ordner ./data/uploads. Für den Live-Betrieb wird das später
// auf einen Cloud-Speicher (z. B. Supabase Storage) umgestellt; nur diese Datei ändert sich dann.

const BASIS = path.join(process.cwd(), "data", "uploads");

export const ERLAUBTE_TYPEN = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"];
export const MAX_GROESSE = 15 * 1024 * 1024;

export class DateiFehler extends Error {}

/** Speichert eine hochgeladene Datei und gibt die ID des Datensatzes zurück. Leere Felder ergeben null. */
export async function speichereDatei(f: File | null, benutzerId: string): Promise<string | null> {
  if (!f || f.size === 0) return null;
  if (!ERLAUBTE_TYPEN.includes(f.type)) {
    throw new DateiFehler("Nur PDF oder Fotos (JPG, PNG, HEIC, WebP) sind erlaubt.");
  }
  if (f.size > MAX_GROESSE) throw new DateiFehler("Die Datei ist größer als 15 MB.");

  const jetzt = new Date();
  const relativ = path.join(
    String(jetzt.getFullYear()),
    String(jetzt.getMonth() + 1).padStart(2, "0"),
    `${randomUUID()}${path.extname(f.name).toLowerCase()}`,
  );
  await mkdir(path.join(BASIS, path.dirname(relativ)), { recursive: true });
  await writeFile(path.join(BASIS, relativ), Buffer.from(await f.arrayBuffer()));

  const db = await getDb();
  const [neu] = await db
    .insert(datei)
    .values({
      originalName: f.name,
      mimeType: f.type,
      groesse: f.size,
      speicherPfad: relativ,
      hochgeladenVon: benutzerId,
    })
    .returning({ id: datei.id });
  return neu.id;
}

export async function ladeDatei(id: string) {
  const db = await getDb();
  const [eintrag] = await db.select().from(datei).where(eq(datei.id, id));
  if (!eintrag) return null;
  const inhalt = await readFile(path.join(BASIS, eintrag.speicherPfad));
  return { eintrag, inhalt };
}

export async function loescheDatei(id: string) {
  const db = await getDb();
  const [eintrag] = await db.delete(datei).where(eq(datei.id, id)).returning();
  if (eintrag) await unlink(path.join(BASIS, eintrag.speicherPfad)).catch(() => {});
}
