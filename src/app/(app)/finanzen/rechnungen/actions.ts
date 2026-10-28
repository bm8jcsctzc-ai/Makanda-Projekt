"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { rechnung } from "@/db/schema";
import { istDatum, optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { benoetigeBenutzer, DARF_FINANZEN } from "@/lib/auth";
import { DateiFehler, loescheDatei, speichereDatei } from "@/lib/dateien";
import { KATEGORIEN, MWST_SAETZE } from "@/lib/finanzen";
import { heute, parseEuro } from "@/lib/format";

/** Neue Rechnung anlegen (id = null) oder bestehende ändern */
export async function speichereRechnung(
  id: string | null,
  _: FormularZustand,
  form: FormData,
): Promise<FormularZustand> {
  const b = await benoetigeBenutzer(DARF_FINANZEN);

  const lieferant = text(form, "lieferant");
  const rechnungsdatum = text(form, "rechnungsdatum");
  const faelligAm = optionalerText(form, "faelligAm");
  const bezahltAm = optionalerText(form, "bezahltAm");
  const bruttoCent = parseEuro(text(form, "brutto"));
  const mwstSatz = Number(text(form, "mwstSatz"));
  const kategorie = text(form, "kategorie");

  if (!lieferant) return { fehler: "Bitte den Lieferanten angeben." };
  if (!istDatum(rechnungsdatum)) return { fehler: "Bitte ein gültiges Rechnungsdatum angeben." };
  if (faelligAm && !istDatum(faelligAm)) return { fehler: "Das Fälligkeitsdatum ist ungültig." };
  if (bezahltAm && !istDatum(bezahltAm)) return { fehler: "Das Zahlungsdatum ist ungültig." };
  if (bruttoCent == null || bruttoCent <= 0) return { fehler: "Bitte einen gültigen Betrag angeben, z. B. 1.234,56." };
  if (!(MWST_SAETZE as readonly number[]).includes(mwstSatz)) return { fehler: "Ungültiger MwSt-Satz." };
  if (!(KATEGORIEN as readonly string[]).includes(kategorie)) return { fehler: "Bitte eine Kategorie wählen." };

  const db = await getDb();
  const alt = id ? (await db.select().from(rechnung).where(eq(rechnung.id, id)))[0] : undefined;
  if (id && !alt) return { fehler: "Diese Rechnung gibt es nicht mehr." };

  let dateiId: string | null;
  try {
    dateiId = await speichereDatei(form.get("datei") as File | null, b.id);
  } catch (e) {
    if (e instanceof DateiFehler) return { fehler: e.message };
    throw e;
  }

  const werte = {
    lieferant,
    rechnungsnummer: optionalerText(form, "rechnungsnummer"),
    rechnungsdatum,
    faelligAm,
    bezahltAm,
    bruttoCent,
    mwstSatz,
    kategorie,
    notiz: optionalerText(form, "notiz"),
  };

  if (alt) {
    // Eine neu hochgeladene Datei ersetzt die alte
    await db
      .update(rechnung)
      .set({ ...werte, dateiId: dateiId ?? alt.dateiId })
      .where(eq(rechnung.id, alt.id));
    if (dateiId && alt.dateiId) await loescheDatei(alt.dateiId);
  } else {
    await db.insert(rechnung).values({ ...werte, dateiId, erstelltVon: b.id });
  }
  revalidatePath("/finanzen", "layout");
  redirect("/finanzen/rechnungen");
}

export async function loescheRechnung(id: string) {
  await benoetigeBenutzer(DARF_FINANZEN);
  const db = await getDb();
  const [geloescht] = await db.delete(rechnung).where(eq(rechnung.id, id)).returning();
  if (geloescht?.dateiId) await loescheDatei(geloescht.dateiId);
  revalidatePath("/finanzen", "layout");
  redirect("/finanzen/rechnungen");
}

export async function alsBezahltMarkieren(id: string) {
  await benoetigeBenutzer(DARF_FINANZEN);
  const db = await getDb();
  await db.update(rechnung).set({ bezahltAm: heute() }).where(eq(rechnung.id, id));
  revalidatePath("/finanzen", "layout");
}
