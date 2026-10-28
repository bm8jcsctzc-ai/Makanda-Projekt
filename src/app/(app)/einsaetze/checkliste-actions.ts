"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { anlage, checklisteErgebnis, checklisteVorlage, einsatz, type Antwort } from "@/db/schema";
import { istUuid, text, type FormularZustand } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { DARF_PLANEN, darfEinsatzBearbeiten, plusMonate, pruefeChecklist } from "@/lib/technik";

export async function checklisteStarten(einsatzId: string, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const b = await benoetigeBenutzer();
  const vorlageId = text(form, "vorlageId");
  if (!istUuid(vorlageId)) return { fehler: "Bitte eine Checkliste wählen." };
  const db = await getDb();
  const [e] = await db.select().from(einsatz).where(eq(einsatz.id, einsatzId));
  if (!e) return { fehler: "Einsatz nicht gefunden." };
  if (!darfEinsatzBearbeiten(b, e)) return { fehler: "Das ist nicht dein Einsatz." };
  if (e.status === "abgeschlossen") return { fehler: "Der Einsatz ist schon abgeschlossen." };
  const [v] = await db.select().from(checklisteVorlage).where(eq(checklisteVorlage.id, vorlageId));
  if (!v) return { fehler: "Checkliste nicht gefunden." };

  const [neu] = await db
    .insert(checklisteErgebnis)
    .values({
      einsatzId,
      anlageId: e.anlageId,
      vorlageId: v.id,
      name: v.name,
      istWartung: v.istWartung,
      punkte: v.punkte,
      ausgefuelltVon: b.id,
    })
    .returning({ id: checklisteErgebnis.id });
  if (e.status === "geplant") await db.update(einsatz).set({ status: "in_arbeit" }).where(eq(einsatz.id, einsatzId));
  revalidatePath("/", "layout");
  redirect(`/einsaetze/${einsatzId}/checkliste/${neu.id}`);
}

/** Antworten speichern; mit `abschliessen` werden Pflichtfelder geprüft und bei Wartungen das nächste Wartungsdatum gesetzt. */
export async function checklisteSpeichern(
  ergebnisId: string,
  antworten: Record<string, Antwort>,
  abschliessen: boolean,
): Promise<FormularZustand> {
  const b = await benoetigeBenutzer();
  const db = await getDb();
  const [zeile] = await db
    .select({ c: checklisteErgebnis, e: einsatz })
    .from(checklisteErgebnis)
    .innerJoin(einsatz, eq(checklisteErgebnis.einsatzId, einsatz.id))
    .where(eq(checklisteErgebnis.id, ergebnisId));
  if (!zeile) return { fehler: "Checkliste nicht gefunden." };
  const { c, e } = zeile;
  if (!darfEinsatzBearbeiten(b, e)) return { fehler: "Das ist nicht dein Einsatz." };
  if (c.abgeschlossen) return { fehler: "Diese Checkliste ist schon abgeschlossen." };

  // Nur Antworten zu bekannten Punkten übernehmen, Längen begrenzen
  const bereinigt: Record<string, Antwort> = {};
  for (const p of c.punkte) {
    const a = antworten[p.id];
    if (!a) continue;
    bereinigt[p.id] = {
      ...(a.wert ? { wert: String(a.wert).slice(0, 2000) } : {}),
      ...(a.bemerkung ? { bemerkung: String(a.bemerkung).slice(0, 2000) } : {}),
    };
  }

  if (abschliessen) {
    const pruefung = pruefeChecklist(c.punkte, bereinigt);
    if (pruefung.fehlend.length) {
      return { fehler: `Noch nicht ausgefüllt: ${pruefung.fehlend.map((p) => p.text).join(" · ")}` };
    }
    if (pruefung.ungueltig.length) {
      return { fehler: `Keine gültige Zahl: ${pruefung.ungueltig.map((p) => p.text).join(" · ")}` };
    }
  }

  await db
    .update(checklisteErgebnis)
    .set({
      antworten: bereinigt,
      geaendertAm: new Date(),
      ...(abschliessen ? { abgeschlossen: true, abgeschlossenAm: new Date() } : {}),
    })
    .where(eq(checklisteErgebnis.id, ergebnisId));

  if (abschliessen && c.istWartung && c.anlageId) {
    const [a] = await db.select().from(anlage).where(eq(anlage.id, c.anlageId));
    if (a) {
      await db
        .update(anlage)
        .set({ letzteWartungAm: e.datum, naechsteWartungAm: plusMonate(e.datum, a.wartungsintervallMonate) })
        .where(eq(anlage.id, a.id));
    }
  }
  revalidatePath("/", "layout");
  if (abschliessen) redirect(`/einsaetze/${e.id}`);
  return { erfolg: "Zwischengespeichert." };
}

export async function checklisteWiederOeffnen(ergebnisId: string) {
  await benoetigeBenutzer(DARF_PLANEN);
  const db = await getDb();
  await db
    .update(checklisteErgebnis)
    .set({ abgeschlossen: false, abgeschlossenAm: null })
    .where(eq(checklisteErgebnis.id, ergebnisId));
  revalidatePath("/", "layout");
}

export async function checklisteLoeschen(ergebnisId: string) {
  const b = await benoetigeBenutzer();
  const db = await getDb();
  const [zeile] = await db
    .select({ c: checklisteErgebnis, e: einsatz })
    .from(checklisteErgebnis)
    .innerJoin(einsatz, eq(checklisteErgebnis.einsatzId, einsatz.id))
    .where(eq(checklisteErgebnis.id, ergebnisId));
  if (!zeile) redirect("/");
  // Abgeschlossene Checklisten sind Nachweise – die darf nur das Büro löschen
  const darf = DARF_PLANEN.includes(b.rolle) || (!zeile.c.abgeschlossen && darfEinsatzBearbeiten(b, zeile.e));
  if (darf) await db.delete(checklisteErgebnis).where(eq(checklisteErgebnis.id, ergebnisId));
  revalidatePath("/", "layout");
  redirect(`/einsaetze/${zeile.e.id}`);
}
