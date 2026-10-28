"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { anlage, benutzer, checklisteErgebnis, einsatz, einsatzart, foto, kunde, type Einsatzart } from "@/db/schema";
import { istDatum, istUuid, optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { loescheDatei } from "@/lib/dateien";
import { DARF_PLANEN, darfEinsatzBearbeiten } from "@/lib/technik";

export async function speichereEinsatz(id: string | null, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  await benoetigeBenutzer(DARF_PLANEN);
  const kundeId = text(form, "kundeId");
  const anlageId = optionalerText(form, "anlageId");
  const monteurId = optionalerText(form, "monteurId");
  const datum = text(form, "datum");
  const uhrzeit = optionalerText(form, "uhrzeit");
  const art = text(form, "art") as Einsatzart;

  if (!istUuid(kundeId)) return { fehler: "Bitte einen Kunden wählen." };
  if (!istDatum(datum)) return { fehler: "Bitte ein gültiges Datum angeben." };
  if (uhrzeit && !/^\d{2}:\d{2}$/.test(uhrzeit)) return { fehler: "Die Uhrzeit ist ungültig." };
  if (!einsatzart.enumValues.includes(art)) return { fehler: "Bitte die Art des Einsatzes wählen." };

  const db = await getDb();
  const [k] = await db.select({ id: kunde.id }).from(kunde).where(eq(kunde.id, kundeId));
  if (!k) return { fehler: "Kunde nicht gefunden." };
  if (anlageId) {
    const [a] = await db.select({ id: anlage.id }).from(anlage).where(and(eq(anlage.id, anlageId), eq(anlage.kundeId, kundeId)));
    if (!a) return { fehler: "Die Anlage gehört nicht zu diesem Kunden." };
  }
  if (monteurId) {
    const [m] = await db.select({ aktiv: benutzer.aktiv }).from(benutzer).where(eq(benutzer.id, monteurId));
    if (!m?.aktiv) return { fehler: "Dieser Mitarbeiter ist nicht aktiv." };
  }

  const werte = { kundeId, anlageId, monteurId, datum, uhrzeit, art, beschreibung: optionalerText(form, "beschreibung") };
  let einsatzId = id;
  if (id) {
    await db.update(einsatz).set(werte).where(eq(einsatz.id, id));
  } else {
    [{ id: einsatzId }] = await db.insert(einsatz).values(werte).returning({ id: einsatz.id });
  }
  revalidatePath("/", "layout");
  redirect(`/einsaetze/${einsatzId}`);
}

export async function loescheEinsatz(id: string) {
  await benoetigeBenutzer(DARF_PLANEN);
  const db = await getDb();
  // Fotos des Einsatzes bleiben beim Kunden bzw. der Anlage erhalten, nur reine Einsatz-Fotos ohne Anlage werden gelöscht
  const fotos = await db.select().from(foto).where(eq(foto.einsatzId, id));
  await db.delete(einsatz).where(eq(einsatz.id, id));
  for (const f of fotos) if (!f.anlageId) await loescheDatei(f.dateiId);
  revalidatePath("/", "layout");
  redirect("/einsaetze");
}

export async function einsatzAbschliessen(id: string, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const b = await benoetigeBenutzer();
  const db = await getDb();
  const [e] = await db.select().from(einsatz).where(eq(einsatz.id, id));
  if (!e) return { fehler: "Einsatz nicht gefunden." };
  if (!darfEinsatzBearbeiten(b, e)) return { fehler: "Das ist nicht dein Einsatz." };
  const offen = await db
    .select({ name: checklisteErgebnis.name })
    .from(checklisteErgebnis)
    .where(and(eq(checklisteErgebnis.einsatzId, id), eq(checklisteErgebnis.abgeschlossen, false)));
  if (offen.length) {
    return { fehler: `Bitte zuerst die Checkliste abschließen: ${offen.map((o) => o.name).join(", ")}` };
  }
  await db
    .update(einsatz)
    .set({ status: "abgeschlossen", abgeschlossenAm: new Date(), abschlussBemerkung: optionalerText(form, "bemerkung") })
    .where(eq(einsatz.id, id));
  revalidatePath("/", "layout");
  return { erfolg: "Einsatz abgeschlossen." };
}

export async function einsatzWiederOeffnen(id: string) {
  await benoetigeBenutzer(DARF_PLANEN);
  const db = await getDb();
  await db.update(einsatz).set({ status: "in_arbeit", abgeschlossenAm: null }).where(eq(einsatz.id, id));
  revalidatePath("/", "layout");
}
