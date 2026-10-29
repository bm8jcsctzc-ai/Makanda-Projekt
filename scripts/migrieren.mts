// Spielt neue Datenbank-Änderungen (supabase/migrations/*.sql) in Supabase ein.
// Läuft bei jedem Veröffentlichen über GitHub Actions; jede Datei wird nur einmal angewendet.
//
//   DATABASE_URL=… npx tsx scripts/migrieren.mts

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL fehlt (GitHub › Settings › Secrets and variables › Actions).");
  process.exit(1);
}
pruefeAdresse(url);

// Der „Transaction pooler“ (Port 6543) kann keine größeren Skripte – dann den „Session pooler“ (Port 5432) nehmen
const verbindung = url.replace(/(pooler\.supabase\.com):6543\b/, "$1:5432");
const sql = postgres(verbindung, { max: 1, onnotice: () => {} });
const ordner = path.join(import.meta.dirname, "..", "supabase", "migrations");

try {
  await sql.unsafe("create schema if not exists intern; create table if not exists intern.migrationen (name text primary key, angewendet_am timestamptz default now())");
  const fertig = new Set((await sql<{ name: string }[]>`select name from intern.migrationen`).map((z) => z.name));
  const neu = readdirSync(ordner).filter((d) => d.endsWith(".sql") && !fertig.has(d)).sort();
  if (neu.length === 0) console.log("Datenbank ist aktuell.");
  for (const datei of neu) {
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(path.join(ordner, datei), "utf8"));
      await tx`insert into intern.migrationen (name) values (${datei})`;
    });
    console.log(`✓ ${datei}`);
  }
} catch (fehler) {
  if ((fehler as { code?: string }).code === "28P01") {
    console.error("✗ Supabase lehnt das Passwort ab. Bitte in Supabase das Datenbank-Passwort neu setzen und DATABASE_URL bei GitHub aktualisieren.");
    process.exitCode = 1;
  } else {
    throw fehler;
  }
} finally {
  await sql.end();
}

/** Häufige Fehler beim Abschreiben der Adresse erkennen – ohne das Passwort auszugeben */
function pruefeAdresse(adresse: string) {
  let u: URL;
  try {
    u = new URL(adresse);
  } catch {
    console.error("DATABASE_URL ist keine gültige Adresse. Sie muss mit postgresql:// beginnen.");
    process.exit(1);
  }
  const passwort = decodeURIComponent(u.password);
  console.log(`Verbinde als ${decodeURIComponent(u.username)} mit ${u.hostname}:${u.port || 5432} (Passwort: ${passwort.length} Zeichen)`);
  const probleme = [
    /[[\]]/.test(passwort) && "Das Passwort enthält noch eckige Klammern [ ] – die gehören nicht dazu.",
    /YOUR-PASSWORD/i.test(passwort) && "Statt des Passworts steht noch YOUR-PASSWORD in der Adresse.",
    /\s/.test(passwort) && "Das Passwort enthält ein Leerzeichen.",
    !passwort && "In der Adresse fehlt das Passwort (zwischen : und @).",
    u.hostname.includes("pooler.supabase.com") && !u.username.includes(".") &&
      "Der Benutzername muss beim Pooler postgres.<Projekt-ID> heißen.",
  ].filter(Boolean);
  for (const p of probleme) console.error(`✗ ${p}`);
  if (probleme.length) process.exit(1);
}
