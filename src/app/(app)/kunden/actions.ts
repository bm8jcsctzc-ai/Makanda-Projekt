"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { foto, kunde } from "@/db/schema";
import { optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { loescheDatei } from "@/lib/dateien";
import { DARF_PLANEN } from "@/lib/technik";

export async function speichereKunde(id: string | null, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  await benoetigeBenutzer(DARF_PLANEN);
  const name = text(form, "name");
  if (!name) return { fehler: "Bitte einen Namen angeben." };
  const email = optionalerText(form, "email");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { fehler: "Die E-Mail-Adresse sieht nicht gültig aus." };

  const werte = {
    name,
    ansprechpartner: optionalerText(form, "ansprechpartner"),
    strasse: optionalerText(form, "strasse"),
    plz: optionalerText(form, "plz"),
    ort: optionalerText(form, "ort"),
    telefon: optionalerText(form, "telefon"),
    email,
    hinweise: optionalerText(form, "hinweise"),
    erinnerungen: form.get("erinnerungen") === "on",
    taifunKundennr: optionalerText(form, "taifunKundennr"),
  };
  const db = await getDb();
  let kundeId = id;
  if (id) {
    await db.update(kunde).set(werte).where(eq(kunde.id, id));
  } else {
    [{ id: kundeId }] = await db.insert(kunde).values(werte).returning({ id: kunde.id });
  }
  revalidatePath("/kunden");
  redirect(`/kunden/${kundeId}`);
}

export async function loescheKunde(id: string) {
  await benoetigeBenutzer(DARF_PLANEN);
  const db = await getDb();
  // Fotodateien zuerst einsammeln, die Datenbankeinträge fallen mit dem Kunden weg
  const fotos = await db.select({ dateiId: foto.dateiId }).from(foto).where(eq(foto.kundeId, id));
  await db.delete(kunde).where(eq(kunde.id, id));
  for (const f of fotos) await loescheDatei(f.dateiId);
  revalidatePath("/kunden");
  redirect("/kunden");
}
