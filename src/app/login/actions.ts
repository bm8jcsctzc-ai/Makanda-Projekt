"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { benutzer } from "@/db/schema";
import { text, type FormularZustand } from "@/lib/aktionen";
import { beendeSitzung, pruefePasswort, starteSitzung } from "@/lib/auth";

export async function anmelden(_: FormularZustand, form: FormData): Promise<FormularZustand> {
  const email = text(form, "email").toLowerCase();
  const passwort = text(form, "passwort");
  const db = await getDb();
  const [b] = await db.select().from(benutzer).where(eq(benutzer.email, email));
  // Absichtlich dieselbe Meldung für unbekannte E-Mail und falsches Passwort
  if (!b || !b.aktiv || !(await pruefePasswort(passwort, b.passwortHash))) {
    return { fehler: "E-Mail oder Passwort ist falsch." };
  }
  await starteSitzung(b.id);
  redirect("/");
}

export async function abmelden() {
  await beendeSitzung();
  redirect("/login");
}
