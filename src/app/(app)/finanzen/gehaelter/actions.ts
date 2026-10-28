"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { personalkosten } from "@/db/schema";
import { istDatum, optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { benoetigeBenutzer, DARF_GEHAELTER } from "@/lib/auth";
import { parseEuro } from "@/lib/format";

export async function speicherePersonalkosten(
  id: string | null,
  _: FormularZustand,
  form: FormData,
): Promise<FormularZustand> {
  await benoetigeBenutzer(DARF_GEHAELTER);
  const mitarbeiter = text(form, "mitarbeiter");
  const bruttoCent = parseEuro(text(form, "brutto"));
  const agText = text(form, "arbeitgeberanteil");
  const arbeitgeberanteilCent = agText ? parseEuro(agText) : 0;
  const gueltigAb = text(form, "gueltigAb");
  const gueltigBis = optionalerText(form, "gueltigBis");

  if (!mitarbeiter) return { fehler: "Bitte den Namen angeben." };
  if (bruttoCent == null || bruttoCent <= 0) return { fehler: "Bitte ein gültiges Bruttogehalt angeben." };
  if (arbeitgeberanteilCent == null || arbeitgeberanteilCent < 0) return { fehler: "Der Arbeitgeberanteil ist ungültig." };
  if (!istDatum(gueltigAb)) return { fehler: "Bitte angeben, ab wann der Betrag gilt." };
  if (gueltigBis && (!istDatum(gueltigBis) || gueltigBis < gueltigAb)) {
    return { fehler: "„Gültig bis“ muss nach „Gültig ab“ liegen." };
  }

  const werte = {
    mitarbeiter,
    funktion: optionalerText(form, "funktion"),
    bruttoCent,
    arbeitgeberanteilCent,
    gueltigAb,
    gueltigBis,
    notiz: optionalerText(form, "notiz"),
  };
  const db = await getDb();
  if (id) {
    await db.update(personalkosten).set(werte).where(eq(personalkosten.id, id));
  } else {
    await db.insert(personalkosten).values(werte);
  }
  revalidatePath("/finanzen", "layout");
  redirect("/finanzen/gehaelter");
}

export async function loeschePersonalkosten(id: string) {
  await benoetigeBenutzer(DARF_GEHAELTER);
  const db = await getDb();
  await db.delete(personalkosten).where(eq(personalkosten.id, id));
  revalidatePath("/finanzen", "layout");
  redirect("/finanzen/gehaelter");
}
