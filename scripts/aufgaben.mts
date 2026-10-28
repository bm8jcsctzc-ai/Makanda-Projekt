// Automatische Aufgaben, gestartet von GitHub Actions (.github/workflows/automatik.yml).
//
//   npx tsx scripts/aufgaben.mts auto            – was gerade dran ist (stündlich aufgerufen)
//   npx tsx scripts/aufgaben.mts erinnerungen    – Wartungserinnerungen jetzt vorbereiten
//   npx tsx scripts/aufgaben.mts wochenbericht   – Wochenbericht jetzt schicken
//   npx tsx scripts/aufgaben.mts mails           – nur wartende E-Mails verschicken
//
// Braucht DATABASE_URL. Mit RESEND_API_KEY und MAIL_ABSENDER werden E-Mails echt verschickt, sonst Testmodus.

import postgres from "postgres";
import {
  erinnerungenVorbereiten,
  resendVersand,
  warteschlangeAbarbeiten,
  wochenberichtSchonDa,
  wochenberichtSenden,
  type Db,
} from "../src/lib/automatik.ts";
import { heute } from "../src/lib/format.ts";

const aufgabe = process.argv[2] ?? "auto";
if (!["auto", "erinnerungen", "wochenbericht", "mails"].includes(aufgabe)) {
  console.error(`Unbekannte Aufgabe: ${aufgabe}`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL fehlt (GitHub › Settings › Secrets and variables › Actions).");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
const db: Db = { abfrage: async (text, werte = []) => (await sql.unsafe(text, werte as never[])) as never };
const versand = resendVersand(process.env.RESEND_API_KEY, process.env.MAIL_ABSENDER);

const tag = heute();
const jetzt = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "numeric", hourCycle: "h23", weekday: "short" }).formatToParts(new Date());
const stunde = Number(jetzt.find((t) => t.type === "hour")!.value);
const wochentag = jetzt.find((t) => t.type === "weekday")!.value; // Mo, Di, …
// Kunden-Mails nur tagsüber; der Wochenbericht ab Montag früh (holt einen ausgefallenen Lauf bis Freitag nach)
const tagsueber = stunde >= 7 && stunde < 20;

try {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_ABSENDER) console.log("Testmodus: E-Mails werden nur im Protokoll gespeichert.");
  if (aufgabe === "erinnerungen" || (aufgabe === "auto" && tagsueber)) {
    console.log("Erinnerungen:", await erinnerungenVorbereiten(db, tag));
  }
  if (
    aufgabe === "wochenbericht" ||
    (aufgabe === "auto" && tagsueber && ["Mo", "Di", "Mi", "Do", "Fr"].includes(wochentag) && !(await wochenberichtSchonDa(db, tag)))
  ) {
    console.log("Wochenbericht:", await wochenberichtSenden(db, tag, versand));
  }
  console.log("E-Mails:", await warteschlangeAbarbeiten(db, versand));
} finally {
  await sql.end();
}
