import type { Anlagentyp, Pruefpunkt, Rolle } from "@/db/schema";
import { optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { api } from "@/lib/api";
import { BUNDESLAENDER } from "@/lib/feiertage";

export type VorlagenDaten = {
  name: string;
  anlagentyp: Anlagentyp | null;
  istWartung: boolean;
  aktiv: boolean;
  punkte: Pruefpunkt[];
};

function bereinige(p: Pruefpunkt): Pruefpunkt | string {
  const text = String(p.text ?? "").trim();
  if (!text) return "Jeder Prüfpunkt braucht einen Text.";
  if (!["pruefung", "messwert", "text"].includes(p.typ)) return `Ungültiger Typ bei „${text}“.`;
  const zahl = (w: unknown) => (w === "" || w == null || Number.isNaN(Number(w)) ? undefined : Number(w));
  const punkt: Pruefpunkt = { id: String(p.id).slice(0, 40), text: text.slice(0, 300), typ: p.typ, pflicht: !!p.pflicht };
  if (p.hilfe?.trim()) punkt.hilfe = p.hilfe.trim().slice(0, 300);
  if (p.typ === "messwert") {
    if (p.einheit?.trim()) punkt.einheit = p.einheit.trim().slice(0, 20);
    punkt.min = zahl(p.min);
    punkt.max = zahl(p.max);
    if (punkt.min != null && punkt.max != null && punkt.min > punkt.max) return `Bei „${text}“ ist der Mindestwert größer als der Höchstwert.`;
  }
  return punkt;
}

export async function speichereVorlage(id: string | null, daten: VorlagenDaten): Promise<FormularZustand> {
  const name = daten.name?.trim();
  if (!name) return { fehler: "Bitte einen Namen angeben." };
  if (!daten.punkte?.length) return { fehler: "Die Checkliste braucht mindestens einen Prüfpunkt." };
  const punkte: Pruefpunkt[] = [];
  for (const p of daten.punkte) {
    const r = bereinige(p);
    if (typeof r === "string") return { fehler: r };
    punkte.push(r);
  }
  if (new Set(punkte.map((p) => p.id)).size !== punkte.length) return { fehler: "Doppelte Prüfpunkte gefunden." };
  await api("vorlage_speichern", {
    p_id: id,
    p_daten: { name, anlagentyp: daten.anlagentyp, ist_wartung: !!daten.istWartung, aktiv: !!daten.aktiv, punkte },
  });
  return { weiter: "/einstellungen/checklisten/" };
}

export async function loescheVorlage(id: string) {
  // Bereits ausgefüllte Checklisten behalten ihre Kopie der Punkte
  await api("vorlage_loeschen", { p_id: id });
  return "/einstellungen/checklisten/";
}

export async function speichereEinstellungen(_: FormularZustand, form: FormData): Promise<FormularZustand> {
  const bueroEmail = optionalerText(form, "bueroEmail");
  if (bueroEmail && !/^\S+@\S+\.\S+$/.test(bueroEmail)) return { fehler: "Die Büro-E-Mail-Adresse sieht nicht gültig aus." };
  const vorlauf = Number(text(form, "erinnerungVorlaufMonate"));
  if (!Number.isInteger(vorlauf) || vorlauf < 1 || vorlauf > 12) return { fehler: "Der Vorlauf muss zwischen 1 und 12 Monaten liegen." };
  const grenzeText = text(form, "haeufungGrenze");
  const grenze = grenzeText ? Number(grenzeText) : null;
  if (grenze != null && (!Number.isInteger(grenze) || grenze < 1)) return { fehler: "Die Grenze muss eine ganze Zahl ab 1 sein." };
  const betreff = text(form, "erinnerungBetreff");
  const mailText = text(form, "erinnerungText");
  if (!betreff || !mailText) return { fehler: "Betreff und Text der Erinnerung dürfen nicht leer sein." };
  const land = text(form, "bundesland");
  await api("einstellungen_speichern", {
    p_daten: {
      firmenname: text(form, "firmenname"),
      firma_telefon: optionalerText(form, "firmaTelefon"),
      buero_email: bueroEmail,
      erinnerungen_aktiv: form.get("erinnerungenAktiv") === "on",
      erinnerung_vorlauf_monate: vorlauf,
      erinnerung_betreff: betreff,
      erinnerung_text: mailText,
      wochenbericht_aktiv: form.get("wochenberichtAktiv") === "on",
      haeufung_grenze: grenze,
      bundesland: land in BUNDESLAENDER ? land : null,
    },
  });
  return { erfolg: "Gespeichert." };
}

export async function benutzerAendern(id: string, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  await api("benutzer_aendern", {
    p_id: id,
    p_rolle: text(form, "rolle"),
    p_aktiv: form.get("aktiv") === "on",
    p_im_team: form.get("imTeam") === "on",
  });
  return { erfolg: "Gespeichert." };
}

export async function einladen(_: FormularZustand, form: FormData): Promise<FormularZustand> {
  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const rolle = text(form, "rolle") as Rolle;
  if (!name || !email) return { fehler: "Bitte Name und E-Mail angeben." };
  const code = await api<string>("einladung_erstellen", { p_name: name, p_email: email, p_rolle: rolle });
  return { erfolg: `${name} ist eingeladen. Einladungscode: ${code}` };
}

export async function einladungLoeschen(id: string) {
  await api("einladung_loeschen", { p_id: id });
}
