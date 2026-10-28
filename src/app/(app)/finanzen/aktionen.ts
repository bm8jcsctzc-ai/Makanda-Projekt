import type { Intervall } from "@/db/schema";
import { istDatum, optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { api } from "@/lib/api";
import { dateiHochladen, dateienEntfernen } from "@/lib/dateien";
import { INTERVALLE, KATEGORIEN, MWST_SAETZE } from "@/lib/finanzen";
import { parseEuro } from "@/lib/format";

/** Neue Rechnung anlegen (id = null) oder bestehende ändern */
export async function speichereRechnung(id: string | null, _: FormularZustand, form: FormData): Promise<FormularZustand> {
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

  const dateiId = await dateiHochladen(form.get("datei") as File | null, "finanzen");
  const r = await api<{ id: string; alterPfad: string | null }>("rechnung_speichern", {
    p_id: id,
    p_daten: {
      lieferant,
      rechnungsnummer: optionalerText(form, "rechnungsnummer"),
      rechnungsdatum,
      faellig_am: faelligAm,
      bezahlt_am: bezahltAm,
      brutto_cent: bruttoCent,
      mwst_satz: mwstSatz,
      kategorie,
      notiz: optionalerText(form, "notiz"),
      datei_id: dateiId,
    },
  });
  await dateienEntfernen([r.alterPfad]);
  return { weiter: "/finanzen/rechnungen/" };
}

export async function loescheRechnung(id: string) {
  await dateienEntfernen([await api<string | null>("rechnung_loeschen", { p_id: id })]);
  return "/finanzen/rechnungen/";
}

export async function speichereFixkosten(id: string | null, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const bezeichnung = text(form, "bezeichnung");
  const kategorie = text(form, "kategorie");
  const betragCent = parseEuro(text(form, "betrag"));
  const iv = text(form, "intervall") as Intervall;
  const beginn = text(form, "beginn");
  const ende = optionalerText(form, "ende");
  if (!bezeichnung) return { fehler: "Bitte eine Bezeichnung angeben." };
  if (!(KATEGORIEN as readonly string[]).includes(kategorie)) return { fehler: "Bitte eine Kategorie wählen." };
  if (betragCent == null || betragCent <= 0) return { fehler: "Bitte einen gültigen Betrag angeben, z. B. 89,90." };
  if (!(iv in INTERVALLE)) return { fehler: "Bitte ein Intervall wählen." };
  if (!istDatum(beginn)) return { fehler: "Bitte ein gültiges Startdatum angeben." };
  if (ende && (!istDatum(ende) || ende < beginn)) return { fehler: "Das Enddatum muss nach dem Start liegen." };
  await api("fixkosten_speichern", {
    p_id: id,
    p_daten: { bezeichnung, kategorie, betrag_cent: betragCent, intervall: iv, beginn, ende, notiz: optionalerText(form, "notiz") },
  });
  return { weiter: "/finanzen/fixkosten/" };
}

export async function loescheFixkosten(id: string) {
  await api("fixkosten_loeschen", { p_id: id });
  return "/finanzen/fixkosten/";
}

export async function speicherePersonalkosten(id: string | null, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const mitarbeiter = text(form, "mitarbeiter");
  const bruttoCent = parseEuro(text(form, "brutto"));
  const agText = text(form, "arbeitgeberanteil");
  const arbeitgeberanteilCent = agText ? parseEuro(agText) : 0;
  const gueltigAb = text(form, "gueltigAb");
  const gueltigBis = optionalerText(form, "gueltigBis");
  if (!mitarbeiter) return { fehler: "Bitte den Namen angeben." };
  if (bruttoCent == null || bruttoCent <= 0) return { fehler: "Bitte ein gültiges Bruttogehalt angeben." };
  if (arbeitgeberanteilCent == null || arbeitgeberanteilCent < 0) return { fehler: "Der Arbeitgeberanteil ist ungültig." };
  if (!istDatum(gueltigAb)) return { fehler: "Bitte angeben, ab wann der Betrag gilt." };
  if (gueltigBis && (!istDatum(gueltigBis) || gueltigBis < gueltigAb)) return { fehler: "„Gültig bis“ muss nach „Gültig ab“ liegen." };
  await api("personalkosten_speichern", {
    p_id: id,
    p_daten: {
      mitarbeiter,
      funktion: optionalerText(form, "funktion"),
      brutto_cent: bruttoCent,
      arbeitgeberanteil_cent: arbeitgeberanteilCent,
      gueltig_ab: gueltigAb,
      gueltig_bis: gueltigBis,
      notiz: optionalerText(form, "notiz"),
    },
  });
  return { weiter: "/finanzen/gehaelter/" };
}

export async function loeschePersonalkosten(id: string) {
  await api("personalkosten_loeschen", { p_id: id });
  return "/finanzen/gehaelter/";
}
