"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { einstellungen } from "@/db/schema";
import { optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { BUNDESLAENDER } from "@/lib/feiertage";
import { DARF_PLANEN } from "@/lib/technik";

export async function speichereEinstellungen(_: FormularZustand, form: FormData): Promise<FormularZustand> {
  await benoetigeBenutzer(DARF_PLANEN);
  const bueroEmail = optionalerText(form, "bueroEmail");
  if (bueroEmail && !/^\S+@\S+\.\S+$/.test(bueroEmail)) return { fehler: "Die Büro-E-Mail-Adresse sieht nicht gültig aus." };
  const vorlauf = Number(text(form, "erinnerungVorlaufMonate"));
  if (!Number.isInteger(vorlauf) || vorlauf < 1 || vorlauf > 12) return { fehler: "Der Vorlauf muss zwischen 1 und 12 Monaten liegen." };
  const grenzeText = text(form, "haeufungGrenze");
  const grenze = grenzeText ? Number(grenzeText) : null;
  if (grenze != null && (!Number.isInteger(grenze) || grenze < 1)) return { fehler: "Die Grenze muss eine ganze Zahl ab 1 sein." };
  const betreff = text(form, "erinnerungBetreff");
  const mailText = text(form, "erinnerungText");
  if (!betreff || !mailText) return { fehler: "Betreff und Text der Erinnerung dürfen nicht leer sein." };

  const db = await getDb();
  await db
    .update(einstellungen)
    .set({
      firmenname: text(form, "firmenname"),
      firmaTelefon: optionalerText(form, "firmaTelefon"),
      bueroEmail,
      erinnerungenAktiv: form.get("erinnerungenAktiv") === "on",
      erinnerungVorlaufMonate: vorlauf,
      erinnerungBetreff: betreff,
      erinnerungText: mailText,
      wochenberichtAktiv: form.get("wochenberichtAktiv") === "on",
      haeufungGrenze: grenze,
      bundesland: text(form, "bundesland") in BUNDESLAENDER ? text(form, "bundesland") : null,
    })
    .where(eq(einstellungen.id, 1));
  revalidatePath("/", "layout");
  return { erfolg: "Gespeichert." };
}
