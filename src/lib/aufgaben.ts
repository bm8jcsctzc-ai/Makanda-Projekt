import { getDb } from "@/db";
import { wartungErinnerung } from "@/db/schema";
import { ladeEinstellungen } from "./einstellungen";
import { wartungsExcel } from "./excel";
import { formatDatum, formatMonat } from "./format";
import { sendeMail } from "./mail";
import { anlagenName, ANLAGENTYPEN, plusMonate } from "./technik";
import { ladeWartungen } from "./wartung-daten";
import { erinnerungFaellig, fuelleText, monatsLast, naechsteMonate, wartungsStatus } from "./wartungsplan";

// Automatische Aufgaben. Sie laufen täglich bzw. wöchentlich über /api/cron und lassen sich
// unter Wartung auch von Hand starten.

export type Ergebnis = { meldung: string };

/** Täglich: Erinnerungen an Kunden, deren Wartung im Vorlauf fällig wird, plus eine Übersicht an das Büro. */
export async function erinnerungenVersenden(heute: string): Promise<Ergebnis> {
  const e = await ladeEinstellungen();
  if (!e.erinnerungenAktiv) return { meldung: "Erinnerungen sind in den Einstellungen ausgeschaltet." };

  const zeilen = await ladeWartungen(heute);
  const faellig = zeilen.filter((z) =>
    erinnerungFaellig(
      {
        anlageId: z.a.id,
        naechsteWartungAm: z.a.naechsteWartungAm,
        kundeEmail: z.k.email,
        kundeErlaubt: z.k.erinnerungen,
        geplant: !!z.geplantAm,
        erinnertFuer: z.erinnertFuer,
      },
      heute,
      e.erinnerungVorlaufMonate,
    ),
  );
  if (faellig.length === 0) return { meldung: "Keine neuen Erinnerungen nötig." };

  const db = await getDb();
  const perMail: string[] = [];
  const anrufen: string[] = [];
  for (const { a, k } of faellig) {
    const zeile = `• ${k.name}${k.ort ? `, ${k.ort}` : ""} – ${anlagenName(a)} – fällig ${formatDatum(a.naechsteWartungAm)}`;
    let anKunde: string | null = null;
    if (k.email && k.erinnerungen) {
      const werte = {
        kunde: k.ansprechpartner || k.name,
        anlage: a.bezeichnung || ANLAGENTYPEN[a.typ],
        faellig: formatDatum(a.naechsteWartungAm),
        firma: e.firmenname || "Ihr Heizungs- und Sanitärbetrieb",
        telefon: e.firmaTelefon || "",
      };
      const status = await sendeMail({
        an: k.email,
        betreff: fuelleText(e.erinnerungBetreff, werte),
        text: fuelleText(e.erinnerungText, werte),
        antwortAn: e.bueroEmail,
      });
      if (status !== "fehler") anKunde = k.email;
    }
    if (anKunde) perMail.push(`${zeile} (E-Mail an ${anKunde})`);
    else anrufen.push(`${zeile}${k.telefon ? ` – Tel. ${k.telefon}` : ""}`);
    // Auch ohne E-Mail merken – sonst stünde der Kunde jeden Tag neu in der Büro-Übersicht
    await db.insert(wartungErinnerung).values({ anlageId: a.id, faelligAm: a.naechsteWartungAm!, anKunde }).onConflictDoNothing();
  }

  if (e.bueroEmail) {
    const teile = [
      `In den nächsten ${e.erinnerungVorlaufMonate} Monaten werden ${faellig.length} Wartungen fällig, für die noch kein Termin geplant ist.`,
      perMail.length ? `Diese Kunden haben eine Erinnerung per E-Mail bekommen:\n${perMail.join("\n")}` : "",
      anrufen.length ? `Diese Kunden haben keine E-Mail-Adresse (oder keine Erinnerungen gewünscht) – bitte anrufen:\n${anrufen.join("\n")}` : "",
    ];
    await sendeMail({
      an: e.bueroEmail,
      betreff: `Wartungserinnerungen: ${faellig.length} Kunden`,
      text: teile.filter(Boolean).join("\n\n"),
    });
  }
  return { meldung: `${perMail.length} Kunden per E-Mail erinnert, ${anrufen.length} zum Anrufen an das Büro gemeldet.` };
}

/** Wöchentlich: Excel mit allen Wartungskunden an das Büro, mit Hinweis auf überfällige Wartungen und Häufungen. */
export async function wochenberichtSenden(heute: string): Promise<Ergebnis> {
  const e = await ladeEinstellungen();
  if (!e.wochenberichtAktiv) return { meldung: "Der Wochenbericht ist in den Einstellungen ausgeschaltet." };
  if (!e.bueroEmail) return { meldung: "Bitte zuerst in den Einstellungen die Büro-E-Mail-Adresse eintragen." };

  const zeilen = await ladeWartungen(heute);
  const excel = await wartungsExcel(zeilen, heute, e.erinnerungVorlaufMonate, e.haeufungGrenze);
  const status = zeilen.map((z) => wartungsStatus(z.a.naechsteWartungAm, heute, e.erinnerungVorlaufMonate));
  const ueberfaellig = zeilen.filter((_, i) => status[i] === "ueberfaellig");
  const baldOhneTermin = zeilen.filter((z, i) => status[i] === "bald" && !z.geplantAm);
  const last = monatsLast(
    zeilen.map((z) => z.a.naechsteWartungAm).filter((d): d is string => !!d),
    naechsteMonate(heute.slice(0, 7), 12),
    e.haeufungGrenze,
  );
  const haeufungen = last.monate.filter((m) => m.auffaellig);

  const text = [
    `Guten Morgen,`,
    `anbei die aktuelle Liste aller Wartungskunden (${zeilen.length} Anlagen).\n` +
      `• Überfällig: ${ueberfaellig.length}\n` +
      `• Fällig bis ${formatDatum(plusMonate(heute, e.erinnerungVorlaufMonate))} ohne geplanten Termin: ${baldOhneTermin.length}`,
    haeufungen.length
      ? `Achtung, Monate mit vielen Wartungen:\n${haeufungen
          .map(
            (m) =>
              `• ${formatMonat(m.monat)}: ${m.anzahl} Wartungen (${m.grund})` +
              (m.ausweichen?.length ? ` – Tipp: einige Termine in ${m.ausweichen.map(formatMonat).join(" oder ")} vorziehen` : ""),
          )
          .join("\n")}`
      : "Keine Häufungen in den nächsten 12 Monaten.",
    ueberfaellig.length
      ? `Überfällige Wartungen:\n${ueberfaellig
          .slice(0, 30)
          .map((z) => `• ${z.k.name}${z.k.ort ? `, ${z.k.ort}` : ""} – seit ${formatDatum(z.a.naechsteWartungAm)}${z.geplantAm ? ` (Termin am ${formatDatum(z.geplantAm)})` : ""}`)
          .join("\n")}${ueberfaellig.length > 30 ? "\n• … weitere in der Excel-Datei" : ""}`
      : "",
  ];
  await sendeMail({
    an: e.bueroEmail,
    betreff: `Wartungskunden – Wochenübersicht ${formatDatum(heute)}`,
    text: text.filter(Boolean).join("\n\n"),
    anhang: { name: `Wartungskunden_${heute}.xlsx`, inhalt: excel },
  });
  return { meldung: `Wochenbericht an ${e.bueroEmail} geschickt (${zeilen.length} Anlagen).` };
}
