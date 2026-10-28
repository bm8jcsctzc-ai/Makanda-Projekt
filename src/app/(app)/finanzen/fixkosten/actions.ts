"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { fixkosten, intervall, type Intervall } from "@/db/schema";
import { istDatum, optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { benoetigeBenutzer, DARF_FINANZEN } from "@/lib/auth";
import { KATEGORIEN } from "@/lib/finanzen";
import { parseEuro } from "@/lib/format";

export async function speichereFixkosten(
  id: string | null,
  _: FormularZustand,
  form: FormData,
): Promise<FormularZustand> {
  await benoetigeBenutzer(DARF_FINANZEN);
  const bezeichnung = text(form, "bezeichnung");
  const kategorie = text(form, "kategorie");
  const betragCent = parseEuro(text(form, "betrag"));
  const iv = text(form, "intervall") as Intervall;
  const beginn = text(form, "beginn");
  const ende = optionalerText(form, "ende");

  if (!bezeichnung) return { fehler: "Bitte eine Bezeichnung angeben." };
  if (!(KATEGORIEN as readonly string[]).includes(kategorie)) return { fehler: "Bitte eine Kategorie wählen." };
  if (betragCent == null || betragCent <= 0) return { fehler: "Bitte einen gültigen Betrag angeben, z. B. 89,90." };
  if (!intervall.enumValues.includes(iv)) return { fehler: "Bitte ein Intervall wählen." };
  if (!istDatum(beginn)) return { fehler: "Bitte ein gültiges Startdatum angeben." };
  if (ende && (!istDatum(ende) || ende < beginn)) return { fehler: "Das Enddatum muss nach dem Start liegen." };

  const werte = { bezeichnung, kategorie, betragCent, intervall: iv, beginn, ende, notiz: optionalerText(form, "notiz") };
  const db = await getDb();
  if (id) {
    await db.update(fixkosten).set(werte).where(eq(fixkosten.id, id));
  } else {
    await db.insert(fixkosten).values(werte);
  }
  revalidatePath("/finanzen", "layout");
  redirect("/finanzen/fixkosten");
}

export async function loescheFixkosten(id: string) {
  await benoetigeBenutzer(DARF_FINANZEN);
  const db = await getDb();
  await db.delete(fixkosten).where(eq(fixkosten.id, id));
  revalidatePath("/finanzen", "layout");
  redirect("/finanzen/fixkosten");
}
