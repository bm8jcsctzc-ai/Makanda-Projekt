import type { FormularZustand } from "@/lib/aktionen";
import { optionalerText, text } from "@/lib/aktionen";
import { api } from "@/lib/api";
import { dateienEntfernen } from "@/lib/dateien";
import { pfad } from "@/lib/pfade";

export async function speichereKunde(id: string | null, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const name = text(form, "name");
  if (!name) return { fehler: "Bitte einen Namen angeben." };
  const email = optionalerText(form, "email");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { fehler: "Die E-Mail-Adresse sieht nicht gültig aus." };
  const kundeId = await api<string>("kunde_speichern", {
    p_id: id,
    p_daten: {
      name,
      ansprechpartner: optionalerText(form, "ansprechpartner"),
      strasse: optionalerText(form, "strasse"),
      plz: optionalerText(form, "plz"),
      ort: optionalerText(form, "ort"),
      telefon: optionalerText(form, "telefon"),
      email,
      hinweise: optionalerText(form, "hinweise"),
      erinnerungen: form.get("erinnerungen") === "on",
      taifun_kundennr: optionalerText(form, "taifunKundennr"),
    },
  });
  return { weiter: pfad.kunde(kundeId) };
}

export async function loescheKunde(id: string) {
  await dateienEntfernen(await api<string[]>("kunde_loeschen", { p_id: id }));
  return "/kunden/";
}
