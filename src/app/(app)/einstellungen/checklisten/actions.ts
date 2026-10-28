"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { anlagentyp, checklisteVorlage, type Anlagentyp, type Pruefpunkt } from "@/db/schema";
import type { FormularZustand } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { DARF_PLANEN } from "@/lib/technik";

export type VorlagenDaten = {
  name: string;
  anlagentyp: Anlagentyp | null;
  istWartung: boolean;
  aktiv: boolean;
  punkte: Pruefpunkt[];
};

function bereinige(p: Pruefpunkt): Pruefpunkt | string {
  const text = String(p.text ?? "").trim();
  if (!text) return "Jeder Prüfpunkt braucht einen Text.";
  if (!["pruefung", "messwert", "text"].includes(p.typ)) return `Ungültiger Typ bei „${text}“.`;
  const zahl = (w: unknown) => (w === "" || w == null || Number.isNaN(Number(w)) ? undefined : Number(w));
  const punkt: Pruefpunkt = { id: String(p.id).slice(0, 40), text: text.slice(0, 300), typ: p.typ, pflicht: !!p.pflicht };
  if (p.hilfe?.trim()) punkt.hilfe = p.hilfe.trim().slice(0, 300);
  if (p.typ === "messwert") {
    if (p.einheit?.trim()) punkt.einheit = p.einheit.trim().slice(0, 20);
    punkt.min = zahl(p.min);
    punkt.max = zahl(p.max);
    if (punkt.min != null && punkt.max != null && punkt.min > punkt.max) return `Bei „${text}“ ist der Mindestwert größer als der Höchstwert.`;
  }
  return punkt;
}

export async function speichereVorlage(id: string | null, daten: VorlagenDaten): Promise<FormularZustand> {
  await benoetigeBenutzer(DARF_PLANEN);
  const name = daten.name?.trim();
  if (!name) return { fehler: "Bitte einen Namen angeben." };
  if (daten.anlagentyp != null && !anlagentyp.enumValues.includes(daten.anlagentyp)) return { fehler: "Ungültiger Anlagentyp." };
  if (!daten.punkte?.length) return { fehler: "Die Checkliste braucht mindestens einen Prüfpunkt." };

  const punkte: Pruefpunkt[] = [];
  for (const p of daten.punkte) {
    const r = bereinige(p);
    if (typeof r === "string") return { fehler: r };
    punkte.push(r);
  }
  if (new Set(punkte.map((p) => p.id)).size !== punkte.length) return { fehler: "Doppelte Prüfpunkte gefunden." };

  const werte = { name, anlagentyp: daten.anlagentyp, istWartung: !!daten.istWartung, aktiv: !!daten.aktiv, punkte };
  const db = await getDb();
  if (id) {
    const [alt] = await db.select().from(checklisteVorlage).where(eq(checklisteVorlage.id, id));
    if (!alt) return { fehler: "Vorlage nicht gefunden." };
    const geaendert = JSON.stringify(alt.punkte) !== JSON.stringify(punkte);
    await db.update(checklisteVorlage).set({ ...werte, version: alt.version + (geaendert ? 1 : 0) }).where(eq(checklisteVorlage.id, id));
  } else {
    await db.insert(checklisteVorlage).values(werte);
  }
  revalidatePath("/einstellungen/checklisten");
  redirect("/einstellungen/checklisten");
}

export async function loescheVorlage(id: string) {
  await benoetigeBenutzer(DARF_PLANEN);
  const db = await getDb();
  // Bereits ausgefüllte Checklisten behalten ihre Kopie der Punkte
  await db.delete(checklisteVorlage).where(eq(checklisteVorlage.id, id));
  revalidatePath("/einstellungen/checklisten");
  redirect("/einstellungen/checklisten");
}
