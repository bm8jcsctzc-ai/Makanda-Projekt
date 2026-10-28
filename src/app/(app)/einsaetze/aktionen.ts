import type { Einsatzart } from "@/db/schema";
import { istDatum, istUuid, optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { api } from "@/lib/api";
import { dateienEntfernen } from "@/lib/dateien";
import { pfad } from "@/lib/pfade";
import { EINSATZARTEN } from "@/lib/technik";

export async function speichereEinsatz(id: string | null, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const kundeId = text(form, "kundeId");
  const datum = text(form, "datum");
  const uhrzeit = optionalerText(form, "uhrzeit");
  const art = text(form, "art") as Einsatzart;
  if (!istUuid(kundeId)) return { fehler: "Bitte einen Kunden wählen." };
  if (!istDatum(datum)) return { fehler: "Bitte ein gültiges Datum angeben." };
  if (uhrzeit && !/^\d{2}:\d{2}$/.test(uhrzeit)) return { fehler: "Die Uhrzeit ist ungültig." };
  if (!(art in EINSATZARTEN)) return { fehler: "Bitte die Art des Einsatzes wählen." };
  const einsatzId = await api<string>("einsatz_speichern", {
    p_id: id,
    p_daten: {
      kunde_id: kundeId,
      anlage_id: optionalerText(form, "anlageId"),
      monteur_id: optionalerText(form, "monteurId"),
      datum,
      uhrzeit,
      art,
      beschreibung: optionalerText(form, "beschreibung"),
    },
  });
  return { weiter: pfad.einsatz(einsatzId) };
}

export async function loescheEinsatz(id: string) {
  await dateienEntfernen(await api<string[]>("einsatz_loeschen", { p_id: id }));
  return "/einsaetze/";
}

export async function einsatzAbschliessen(id: string, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  await api("einsatz_abschliessen", { p_id: id, p_bemerkung: optionalerText(form, "bemerkung") });
  return { erfolg: "Einsatz abgeschlossen." };
}

export async function checklisteStarten(einsatzId: string, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const vorlageId = text(form, "vorlageId");
  if (!istUuid(vorlageId)) return { fehler: "Bitte eine Checkliste wählen." };
  const id = await api<string>("checkliste_starten", { p_einsatz_id: einsatzId, p_vorlage_id: vorlageId });
  return { weiter: pfad.checkliste(id) };
}
