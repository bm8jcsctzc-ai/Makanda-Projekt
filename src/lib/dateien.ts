import { api } from "./api";
import { supabase } from "./supabase";

// Rechnungen (finanzen/…) und Fotos (technik/…) im privaten Supabase-Speicher.
// Wer was darf, prüfen die Speicher-Regeln in der Datenbank (supabase/migrations/0004_speicher.sql).

const BUCKET = "dateien";
const BILD_TYPEN = ["image/jpeg", "image/png", "image/heic", "image/webp"];
export const ERLAUBTE_TYPEN = ["application/pdf", ...BILD_TYPEN];
export const MAX_GROESSE = 10 * 1024 * 1024;

export class DateiFehler extends Error {}

export type Bereich = "finanzen" | "technik";

/** Lädt eine Datei hoch, trägt sie ein und gibt die ID zurück. Leere Felder ergeben null. */
export async function dateiHochladen(f: File | null, bereich: Bereich): Promise<string | null> {
  if (!f || f.size === 0) return null;
  if (bereich === "technik" ? !BILD_TYPEN.includes(f.type) : !ERLAUBTE_TYPEN.includes(f.type)) {
    throw new DateiFehler(bereich === "technik" ? "Hier sind nur Fotos erlaubt." : "Nur PDF oder Fotos (JPG, PNG, HEIC, WebP) sind erlaubt.");
  }
  if (f.size > MAX_GROESSE) throw new DateiFehler("Die Datei ist größer als 10 MB.");

  const jetzt = new Date();
  const endung = (f.name.match(/\.[a-z0-9]{1,5}$/i)?.[0] ?? "").toLowerCase();
  const pfad = [bereich, jetzt.getFullYear(), String(jetzt.getMonth() + 1).padStart(2, "0"), `${crypto.randomUUID()}${endung}`].join("/");
  const { error } = await supabase.storage.from(BUCKET).upload(pfad, await f.arrayBuffer(), { contentType: f.type });
  if (error) throw new DateiFehler(`Hochladen fehlgeschlagen: ${error.message}`);
  try {
    return await api<string>("datei_registrieren", { p_pfad: pfad, p_name: f.name, p_typ: f.type, p_groesse: f.size });
  } catch (e) {
    await dateienEntfernen([pfad]);
    throw e;
  }
}

/** Entfernt Dateien aus dem Speicher (nachdem die Datenbank-Einträge gelöscht wurden). Fehler werden nur protokolliert. */
export async function dateienEntfernen(pfade: (string | null | undefined)[]) {
  const liste = pfade.filter((p): p is string => !!p);
  if (!liste.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(liste);
  if (error) console.error("Datei konnte nicht entfernt werden", error);
}

/** Zeitlich begrenzte Links (1 Stunde) zum Ansehen der Dateien */
export async function signierteUrls(pfade: string[]): Promise<Map<string, string>> {
  if (!pfade.length) return new Map();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(pfade, 3600);
  if (error) throw new DateiFehler(error.message);
  const urls = new Map<string, string>();
  for (const d of data) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl);
  return urls;
}

/** Öffnet eine Datei in einem neuen Tab */
export async function dateiOeffnen(pfad: string) {
  const fenster = window.open("", "_blank");
  const urls = await signierteUrls([pfad]);
  const url = urls.get(pfad);
  if (url && fenster) fenster.location.href = url;
  else fenster?.close();
}
