import type { Anlagentyp } from "@/db/schema";
import { istDatum, optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { api } from "@/lib/api";
import { dateienEntfernen } from "@/lib/dateien";
import { pfad } from "@/lib/pfade";
import { ANLAGENTYPEN, plusMonate } from "@/lib/technik";

// Anlagen dürfen alle anlegen und ändern – Monteure erfassen Typenschilder oft erst vor Ort.
export async function speichereAnlage(id: string | null, kundeId: string, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const typ = text(form, "typ") as Anlagentyp;
  if (!(typ in ANLAGENTYPEN)) return { fehler: "Bitte die Art der Anlage wählen." };

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

  const anlageId = await api<string>("anlage_speichern", {
    p_id: id,
    p_kunde_id: kundeId,
    p_daten: {
      typ,
      bezeichnung: optionalerText(form, "bezeichnung"),
      hersteller: optionalerText(form, "hersteller"),
      modell: optionalerText(form, "modell"),
      seriennummer: optionalerText(form, "seriennummer"),
      baujahr,
      leistung_kw: optionalerText(form, "leistungKw"),
      kaeltemittel: optionalerText(form, "kaeltemittel"),
      kaeltemittel_kg: optionalerText(form, "kaeltemittelKg"),
      aufstellort: optionalerText(form, "aufstellort"),
      wartungsintervall_monate: intervall,
      letzte_wartung_am: letzteWartungAm,
      naechste_wartung_am: naechsteWartungAm,
      notiz: optionalerText(form, "notiz"),
    },
  });
  return { weiter: pfad.anlage(anlageId) };
}

export async function loescheAnlage(id: string) {
  const r = await api<{ kundeId: string; pfade: string[] }>("anlage_loeschen", { p_id: id });
  await dateienEntfernen(r.pfade);
  return pfad.kunde(r.kundeId);
}
