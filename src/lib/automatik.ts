import type { Einstellungen } from "@/db/schema";
import { wartungsExcel } from "./excel";
import { formatDatum, formatMonat } from "./format";
import { anlagenName, ANLAGENTYPEN, plusMonate } from "./technik";
import type { WartungsZeile } from "./typen";
import { zuCamel } from "./umwandeln";
import { erinnerungFaellig, fuelleText, monatsLast, naechsteMonate, wartungsStatus } from "./wartungsplan";

// Automatische Aufgaben. Sie laufen über GitHub Actions (scripts/aufgaben.ts) direkt auf der Datenbank:
// Erinnerungen an Kunden, Wochenbericht mit Excel an das Büro und Versand der wartenden E-Mails.

/** Datenbank-Zugang: Postgres (im Betrieb) oder PGlite (in den Tests) */
export type Db = { abfrage<T = Record<string, unknown>>(sql: string, werte?: unknown[]): Promise<T[]> };

export type Mail = { an: string; betreff: string; text: string; anhang?: { name: string; inhalt: Uint8Array }; antwortAn?: string | null };
export type VersandErgebnis = { status: "gesendet" | "testmodus" | "fehler"; fehler?: string };
/** Verschickt eine E-Mail (Resend) oder tut im Testmodus nichts */
export type Versand = (mail: Mail) => Promise<VersandErgebnis>;

const WOCHENBERICHT_BETREFF = "Wartungskunden – Wochenübersicht";

async function ladeEinstellungen(db: Db): Promise<Einstellungen> {
  const [z] = await db.abfrage<{ e: unknown }>("select to_jsonb(e) as e from einstellungen e where id = 1");
  return zuCamel(z.e) as Einstellungen;
}

async function ladeWartungen(db: Db, heute: string): Promise<WartungsZeile[]> {
  const [z] = await db.abfrage<{ d: unknown }>("select intern.wartungsdaten($1::date) as d", [heute]);
  return zuCamel(z.d) as WartungsZeile[];
}

/** Legt eine E-Mail in die Warteschlange (verschickt wird sie von warteschlangeAbarbeiten) */
async function einreihen(db: Db, an: string, betreff: string, text: string) {
  await db.abfrage("insert into mail_protokoll (an, betreff, text, status) values ($1, $2, $3, 'wartend')", [an, betreff, text]);
}

/** Täglich: Erinnerungen an Kunden, deren Wartung im Vorlauf fällig wird, plus eine Übersicht an das Büro. */
export async function erinnerungenVorbereiten(db: Db, heute: string): Promise<string> {
  const e = await ladeEinstellungen(db);
  if (!e.erinnerungenAktiv) return "Erinnerungen sind in den Einstellungen ausgeschaltet.";

  const zeilen = await ladeWartungen(db, heute);
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
  if (faellig.length === 0) return "Keine neuen Erinnerungen nötig.";

  const perMail: string[] = [];
  const anrufen: string[] = [];
  for (const { a, k } of faellig) {
    const zeile = `• ${k.name}${k.ort ? `, ${k.ort}` : ""} – ${anlagenName(a)} – fällig ${formatDatum(a.naechsteWartungAm)}`;
    const anKunde = k.email && k.erinnerungen ? k.email : null;
    if (anKunde) {
      const werte = {
        kunde: k.ansprechpartner || k.name,
        anlage: a.bezeichnung || ANLAGENTYPEN[a.typ],
        faellig: formatDatum(a.naechsteWartungAm),
        firma: e.firmenname || "Ihr Heizungs- und Sanitärbetrieb",
        telefon: e.firmaTelefon || "",
      };
      await einreihen(db, anKunde, fuelleText(e.erinnerungBetreff, werte), fuelleText(e.erinnerungText, werte));
      perMail.push(`${zeile} (E-Mail an ${anKunde})`);
    } else {
      anrufen.push(`${zeile}${k.telefon ? ` – Tel. ${k.telefon}` : ""}`);
    }
    // Auch ohne E-Mail merken – sonst stünde der Kunde jeden Tag neu in der Büro-Übersicht
    await db.abfrage(
      "insert into wartung_erinnerung (anlage_id, faellig_am, an_kunde) values ($1, $2, $3) on conflict do nothing",
      [a.id, a.naechsteWartungAm, anKunde],
    );
  }

  if (e.bueroEmail) {
    const teile = [
      `In den nächsten ${e.erinnerungVorlaufMonate} Monaten werden ${faellig.length} Wartungen fällig, für die noch kein Termin geplant ist.`,
      perMail.length ? `Diese Kunden bekommen eine Erinnerung per E-Mail:\n${perMail.join("\n")}` : "",
      anrufen.length ? `Diese Kunden haben keine E-Mail-Adresse (oder keine Erinnerungen gewünscht) – bitte anrufen:\n${anrufen.join("\n")}` : "",
    ];
    await einreihen(db, e.bueroEmail, `Wartungserinnerungen: ${faellig.length} Kunden`, teile.filter(Boolean).join("\n\n"));
  }
  return `${perMail.length} Kunden per E-Mail erinnert, ${anrufen.length} zum Anrufen an das Büro gemeldet.`;
}

/** Montag der Woche, in der `tag` liegt */
export function wochenbeginn(tag: string): string {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Wurde der Wochenbericht in dieser Woche schon verschickt? */
export async function wochenberichtSchonDa(db: Db, heute: string): Promise<boolean> {
  const z = await db.abfrage(
    "select 1 from mail_protokoll where betreff like $1 and erstellt_am >= ($2::date)::timestamp at time zone 'Europe/Berlin' limit 1",
    [`${WOCHENBERICHT_BETREFF}%`, wochenbeginn(heute)],
  );
  return z.length > 0;
}

/** Wöchentlich: Excel mit allen Wartungskunden an das Büro, mit Hinweis auf überfällige Wartungen und Häufungen. */
export async function wochenberichtSenden(db: Db, heute: string, versand: Versand): Promise<string> {
  const e = await ladeEinstellungen(db);
  if (!e.wochenberichtAktiv) return "Der Wochenbericht ist in den Einstellungen ausgeschaltet.";
  if (!e.bueroEmail) return "Bitte zuerst in den Einstellungen die Büro-E-Mail-Adresse eintragen.";

  const zeilen = await ladeWartungen(db, heute);
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
  const mail: Mail = {
    an: e.bueroEmail,
    betreff: `${WOCHENBERICHT_BETREFF} ${formatDatum(heute)}`,
    text: text.filter(Boolean).join("\n\n"),
    anhang: { name: `Wartungskunden_${heute}.xlsx`, inhalt: excel },
  };
  const r = await versand(mail);
  await db.abfrage("insert into mail_protokoll (an, betreff, text, anhang, status, fehler) values ($1, $2, $3, $4, $5::mailstatus, $6)", [
    mail.an,
    mail.betreff,
    mail.text,
    mail.anhang!.name,
    r.status,
    r.fehler ?? null,
  ]);
  return r.status === "fehler" ? `Wochenbericht konnte nicht verschickt werden: ${r.fehler}` : `Wochenbericht an ${e.bueroEmail} (${zeilen.length} Anlagen).`;
}

/** Verschickt alle wartenden E-Mails (Erinnerungen, Urlaubsanträge, Entscheidungen) */
export async function warteschlangeAbarbeiten(db: Db, versand: Versand): Promise<string> {
  const e = await ladeEinstellungen(db);
  const wartend = await db.abfrage<{ id: string; an: string; betreff: string; text: string }>(
    "select id, an, betreff, text from mail_protokoll where status = 'wartend' order by erstellt_am limit 200",
  );
  let fehler = 0;
  for (const m of wartend) {
    const r = await versand({ an: m.an, betreff: m.betreff, text: m.text, antwortAn: e.bueroEmail });
    if (r.status === "fehler") fehler++;
    await db.abfrage("update mail_protokoll set status = $2::mailstatus, fehler = $3 where id = $1", [m.id, r.status, r.fehler ?? null]);
  }
  if (wartend.length === 0) return "Keine wartenden E-Mails.";
  return `${wartend.length - fehler} E-Mails verarbeitet${fehler ? `, ${fehler} mit Fehler` : ""}.`;
}

/** Versand über Resend (https://resend.com); ohne Schlüssel oder Absender läuft der Testmodus */
export function resendVersand(schluessel: string | undefined, absender: string | undefined): Versand {
  if (!schluessel || !absender) return async () => ({ status: "testmodus" });
  return async (mail) => {
    try {
      const antwort = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${schluessel}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: absender,
          to: [mail.an],
          subject: mail.betreff,
          text: mail.text,
          ...(mail.antwortAn ? { reply_to: mail.antwortAn } : {}),
          ...(mail.anhang ? { attachments: [{ filename: mail.anhang.name, content: Buffer.from(mail.anhang.inhalt).toString("base64") }] } : {}),
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (antwort.ok) return { status: "gesendet" };
      return { status: "fehler", fehler: `${antwort.status}: ${(await antwort.text()).slice(0, 500)}` };
    } catch (f) {
      return { status: "fehler", fehler: f instanceof Error ? f.message : String(f) };
    }
  };
}
