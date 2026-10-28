"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { benutzer, rolle, type Rolle } from "@/db/schema";
import { text, type FormularZustand } from "@/lib/aktionen";
import { benoetigeBenutzer, DARF_BENUTZER, hashePasswort } from "@/lib/auth";
import { MIN_PASSWORT_LAENGE } from "@/lib/benutzer";

export async function benutzerAnlegen(_: FormularZustand, form: FormData): Promise<FormularZustand> {
  await benoetigeBenutzer(DARF_BENUTZER);
  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const r = text(form, "rolle") as Rolle;
  const passwort = text(form, "passwort");
  if (!name || !email) return { fehler: "Bitte Name und E-Mail angeben." };
  if (!rolle.enumValues.includes(r)) return { fehler: "Bitte eine Rolle wählen." };
  if (passwort.length < MIN_PASSWORT_LAENGE) {
    return { fehler: `Das Startpasswort muss mindestens ${MIN_PASSWORT_LAENGE} Zeichen haben.` };
  }
  const db = await getDb();
  const [vorhanden] = await db.select({ id: benutzer.id }).from(benutzer).where(eq(benutzer.email, email));
  if (vorhanden) return { fehler: "Diese E-Mail-Adresse ist schon vergeben." };
  await db.insert(benutzer).values({ name, email, rolle: r, passwortHash: await hashePasswort(passwort) });
  revalidatePath("/einstellungen/benutzer");
  return { erfolg: `${name} wurde angelegt. Gib das Startpasswort persönlich weiter.` };
}

/** Verhindert, dass der letzte aktive Inhaber entfernt wird – sonst kommt niemand mehr in die Verwaltung. */
async function istLetzterInhaber(id: string) {
  const db = await getDb();
  const [{ anzahl }] = await db
    .select({ anzahl: count() })
    .from(benutzer)
    .where(and(eq(benutzer.rolle, "inhaber"), eq(benutzer.aktiv, true), ne(benutzer.id, id)));
  return anzahl === 0;
}

export async function benutzerAendern(id: string, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const ich = await benoetigeBenutzer(DARF_BENUTZER);
  const r = text(form, "rolle") as Rolle;
  const aktiv = form.get("aktiv") === "on";
  const passwort = text(form, "passwort");
  if (!rolle.enumValues.includes(r)) return { fehler: "Ungültige Rolle." };
  if (id === ich.id && !aktiv) return { fehler: "Du kannst dich nicht selbst deaktivieren." };
  if ((r !== "inhaber" || !aktiv) && (await istLetzterInhaber(id))) {
    return { fehler: "Es muss mindestens ein aktiver Inhaber bleiben." };
  }
  if (passwort && passwort.length < MIN_PASSWORT_LAENGE) {
    return { fehler: `Das neue Passwort muss mindestens ${MIN_PASSWORT_LAENGE} Zeichen haben.` };
  }
  const db = await getDb();
  await db
    .update(benutzer)
    .set({ rolle: r, aktiv, ...(passwort ? { passwortHash: await hashePasswort(passwort) } : {}) })
    .where(eq(benutzer.id, id));
  revalidatePath("/einstellungen/benutzer");
  return { erfolg: passwort ? "Gespeichert, neues Passwort gesetzt." : "Gespeichert." };
}
