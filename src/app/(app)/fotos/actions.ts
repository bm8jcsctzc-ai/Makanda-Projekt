"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { anlage, einsatz, foto, fotokategorie, type Fotokategorie } from "@/db/schema";
import { istUuid, optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { DateiFehler, loescheDatei, speichereDatei } from "@/lib/dateien";
import { DARF_PLANEN, darfEinsatzBearbeiten } from "@/lib/technik";

/** Ein Foto hochladen. Es hängt immer an einem Kunden und optional an Einsatz und/oder Anlage. */
export async function fotoHochladen(form: FormData): Promise<FormularZustand> {
  const b = await benoetigeBenutzer();
  const kundeId = text(form, "kundeId");
  const einsatzId = optionalerText(form, "einsatzId");
  const anlageId = optionalerText(form, "anlageId");
  const kategorie = text(form, "kategorie") as Fotokategorie;
  if (!istUuid(kundeId)) return { fehler: "Kunde fehlt." };
  if (!fotokategorie.enumValues.includes(kategorie)) return { fehler: "Bitte eine Kategorie wählen." };

  const db = await getDb();
  if (einsatzId) {
    if (!istUuid(einsatzId)) return { fehler: "Ungültiger Einsatz." };
    const [e] = await db.select().from(einsatz).where(eq(einsatz.id, einsatzId));
    if (!e || e.kundeId !== kundeId) return { fehler: "Einsatz nicht gefunden." };
    if (!darfEinsatzBearbeiten(b, e)) return { fehler: "Das ist nicht dein Einsatz." };
    if (e.status === "geplant") await db.update(einsatz).set({ status: "in_arbeit" }).where(eq(einsatz.id, e.id));
  }
  if (anlageId) {
    if (!istUuid(anlageId)) return { fehler: "Ungültige Anlage." };
    const [a] = await db.select({ kundeId: anlage.kundeId }).from(anlage).where(eq(anlage.id, anlageId));
    if (!a || a.kundeId !== kundeId) return { fehler: "Anlage nicht gefunden." };
  }

  let dateiId: string | null;
  try {
    dateiId = await speichereDatei(form.get("datei") as File | null, b.id, "technik");
  } catch (e) {
    if (e instanceof DateiFehler) return { fehler: e.message };
    throw e;
  }
  if (!dateiId) return { fehler: "Kein Foto ausgewählt." };

  await db.insert(foto).values({
    dateiId,
    kundeId,
    einsatzId,
    anlageId,
    kategorie,
    beschreibung: optionalerText(form, "beschreibung"),
    aufgenommenVon: b.id,
  });
  revalidatePath("/", "layout");
  return { erfolg: "Foto gespeichert." };
}

export async function fotoLoeschen(fotoId: string) {
  const b = await benoetigeBenutzer();
  const db = await getDb();
  const [f] = await db.select().from(foto).where(eq(foto.id, fotoId));
  if (!f) return;
  if (!DARF_PLANEN.includes(b.rolle) && f.aufgenommenVon !== b.id) return;
  await loescheDatei(f.dateiId); // löscht den Foto-Eintrag mit
  revalidatePath("/", "layout");
}
