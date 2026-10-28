"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { anlage, anlagentyp, foto, kunde, type Anlagentyp } from "@/db/schema";
import { istDatum, istUuid, optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { loescheDatei } from "@/lib/dateien";
import { DARF_PLANEN, plusMonate } from "@/lib/technik";

// Anlagen dürfen alle anlegen und ändern – Monteure erfassen Typenschilder oft erst vor Ort.
export async function speichereAnlage(
  id: string | null,
  kundeId: string,
  _: FormularZustand,
  form: FormData,
): Promise<FormularZustand> {
  await benoetigeBenutzer();
  if (!istUuid(kundeId)) return { fehler: "Kunde fehlt." };
  const typ = text(form, "typ") as Anlagentyp;
  if (!anlagentyp.enumValues.includes(typ)) return { fehler: "Bitte die Art der Anlage wählen." };

  const baujahrText = text(form, "baujahr");
  const baujahr = baujahrText ? Number(baujahrText) : null;
  if (baujahr != null && (!Number.isInteger(baujahr) || baujahr < 1950 || baujahr > new Date().getFullYear() + 1)) {
    return { fehler: "Bitte ein gültiges Baujahr angeben (z. B. 2018)." };
  }
  const intervall = Number(text(form, "wartungsintervallMonate") || 12);
  if (!Number.isInteger(intervall) || intervall < 1 || intervall > 60) {
    return { fehler: "Das Wartungsintervall muss zwischen 1 und 60 Monaten liegen." };
  }
  const letzteWartungAm = optionalerText(form, "letzteWartungAm");
  let naechsteWartungAm = optionalerText(form, "naechsteWartungAm");
  if (letzteWartungAm && !istDatum(letzteWartungAm)) return { fehler: "Das Datum der letzten Wartung ist ungültig." };
  if (naechsteWartungAm && !istDatum(naechsteWartungAm)) return { fehler: "Das Datum der nächsten Wartung ist ungültig." };
  // Nächste Wartung automatisch aus letzter Wartung + Intervall, wenn nichts eingetragen ist
  if (!naechsteWartungAm && letzteWartungAm) naechsteWartungAm = plusMonate(letzteWartungAm, intervall);

  const werte = {
    typ,
    bezeichnung: optionalerText(form, "bezeichnung"),
    hersteller: optionalerText(form, "hersteller"),
    modell: optionalerText(form, "modell"),
    seriennummer: optionalerText(form, "seriennummer"),
    baujahr,
    leistungKw: optionalerText(form, "leistungKw"),
    kaeltemittel: optionalerText(form, "kaeltemittel"),
    kaeltemittelKg: optionalerText(form, "kaeltemittelKg"),
    aufstellort: optionalerText(form, "aufstellort"),
    wartungsintervallMonate: intervall,
    letzteWartungAm,
    naechsteWartungAm,
    notiz: optionalerText(form, "notiz"),
  };

  const db = await getDb();
  let anlageId = id;
  if (id) {
    await db.update(anlage).set(werte).where(eq(anlage.id, id));
  } else {
    const [k] = await db.select({ id: kunde.id }).from(kunde).where(eq(kunde.id, kundeId));
    if (!k) return { fehler: "Kunde nicht gefunden." };
    [{ id: anlageId }] = await db.insert(anlage).values({ ...werte, kundeId }).returning({ id: anlage.id });
  }
  revalidatePath("/", "layout");
  redirect(`/anlagen/${anlageId}`);
}

export async function loescheAnlage(id: string) {
  await benoetigeBenutzer(DARF_PLANEN);
  const db = await getDb();
  const [a] = await db.select().from(anlage).where(eq(anlage.id, id));
  if (!a) redirect("/kunden");
  const fotos = await db.select({ dateiId: foto.dateiId }).from(foto).where(eq(foto.anlageId, id));
  await db.delete(anlage).where(eq(anlage.id, id));
  for (const f of fotos) await loescheDatei(f.dateiId);
  revalidatePath("/", "layout");
  redirect(`/kunden/${a.kundeId}`);
}
