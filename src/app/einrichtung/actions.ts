"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { benutzer } from "@/db/schema";
import { text, type FormularZustand } from "@/lib/aktionen";
import { hashePasswort, starteSitzung } from "@/lib/auth";
import { gibtEsBenutzer, MIN_PASSWORT_LAENGE } from "@/lib/benutzer";

// Legt den allerersten Zugang an (Rolle Inhaber). Funktioniert nur, solange es noch keinen Benutzer gibt.
export async function ersteinrichtung(_: FormularZustand, form: FormData): Promise<FormularZustand> {
  if (await gibtEsBenutzer()) redirect("/login");
  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const passwort = text(form, "passwort");
  if (!name || !email) return { fehler: "Bitte Name und E-Mail angeben." };
  if (passwort.length < MIN_PASSWORT_LAENGE) {
    return { fehler: `Das Passwort muss mindestens ${MIN_PASSWORT_LAENGE} Zeichen haben.` };
  }
  if (passwort !== text(form, "passwort2")) return { fehler: "Die Passwörter stimmen nicht überein." };

  const db = await getDb();
  const [neu] = await db
    .insert(benutzer)
    .values({ name, email, passwortHash: await hashePasswort(passwort), rolle: "inhaber" })
    .returning({ id: benutzer.id });
  await starteSitzung(neu.id);
  redirect("/");
}
