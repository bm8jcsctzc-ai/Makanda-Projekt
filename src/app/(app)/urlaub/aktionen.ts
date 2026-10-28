import type { Abwesenheitsart } from "@/db/schema";
import { istDatum, istUuid, optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { api } from "@/lib/api";
import type { Bundesland } from "@/lib/feiertage";
import { pfad } from "@/lib/pfade";
import { ARTEN, arbeitstage } from "@/lib/urlaub";

/** Neue Abwesenheit. Die Datenbank sorgt dafür, dass Monteure nur Urlaub für sich selbst beantragen. */
export async function abwesenheitEintragen(land: Bundesland | null, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const art = (text(form, "art") || "urlaub") as Abwesenheitsart;
  const von = text(form, "von");
  const bis = text(form, "bis") || von;
  const halbtags = form.get("halbtags") === "on";
  const benutzerId = optionalerText(form, "benutzerId");
  if (benutzerId && !istUuid(benutzerId)) return { fehler: "Bitte einen Mitarbeiter wählen." };
  if (!(art in ARTEN)) return { fehler: "Bitte die Art wählen." };
  if (!istDatum(von) || !istDatum(bis)) return { fehler: "Bitte gültige Daten angeben." };
  if (bis < von) return { fehler: "„Bis“ darf nicht vor „Von“ liegen." };
  if (halbtags && von !== bis) return { fehler: "Ein halber Tag geht nur bei einem einzelnen Tag." };
  const tage = arbeitstage({ von, bis, halbtags }, land);
  if (art === "urlaub" && tage === 0) return { fehler: "In diesem Zeitraum liegt kein Arbeitstag (nur Wochenende oder Feiertage)." };

  const id = await api<string>("abwesenheit_eintragen", {
    p_daten: { benutzer_id: benutzerId, art, von, bis, halbtags, bemerkung: optionalerText(form, "bemerkung") },
    p_tage: tage,
  });
  return { weiter: pfad.abwesenheit(id) };
}

export async function entscheiden(id: string, genehmigt: boolean, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const kommentar = optionalerText(form, "kommentar");
  if (!genehmigt && !kommentar) return { fehler: "Bitte kurz begründen, warum der Antrag abgelehnt wird." };
  await api("abwesenheit_entscheiden", { p_id: id, p_genehmigt: genehmigt, p_kommentar: kommentar });
  return { erfolg: genehmigt ? "Genehmigt." : "Abgelehnt." };
}

export async function kontoSpeichern(benutzerId: string, jahr: number, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const anspruch = Number(text(form, "anspruch"));
  const uebertrag = Number(text(form, "uebertrag").replace(",", ".") || 0);
  if (!Number.isInteger(anspruch) || anspruch < 0 || anspruch > 60) return { fehler: "Anspruch: ganze Zahl zwischen 0 und 60." };
  if (Number.isNaN(uebertrag) || uebertrag < 0 || uebertrag > 60 || (uebertrag * 2) % 1 !== 0) {
    return { fehler: "Übertrag: Zahl in halben Tagen, z. B. 2,5." };
  }
  await api("konto_speichern", { p_benutzer_id: benutzerId, p_jahr: jahr, p_anspruch: anspruch, p_uebertrag_halbe: uebertrag * 2 });
  return { erfolg: "Gespeichert." };
}
