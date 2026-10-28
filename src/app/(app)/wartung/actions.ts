"use server";

import { revalidatePath } from "next/cache";
import type { FormularZustand } from "@/lib/aktionen";
import { erinnerungenVersenden, wochenberichtSenden } from "@/lib/aufgaben";
import { benoetigeBenutzer } from "@/lib/auth";
import { heute } from "@/lib/format";
import { DARF_PLANEN } from "@/lib/technik";

/** Startet eine automatische Aufgabe von Hand (zum Testen oder wenn es eilt) */
export async function aufgabeStarten(aufgabe: "erinnerungen" | "wochenbericht"): Promise<FormularZustand> {
  await benoetigeBenutzer(DARF_PLANEN);
  const ergebnis = aufgabe === "erinnerungen" ? await erinnerungenVersenden(heute()) : await wochenberichtSenden(heute());
  revalidatePath("/", "layout");
  return { erfolg: ergebnis.meldung };
}
