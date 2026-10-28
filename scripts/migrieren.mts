// Spielt neue Datenbank-Änderungen (supabase/migrations/*.sql) in Supabase ein.
// Läuft bei jedem Veröffentlichen über GitHub Actions; jede Datei wird nur einmal angewendet.
//
//   DATABASE_URL=… npx tsx scripts/migrieren.mts

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL fehlt (GitHub › Settings › Secrets and variables › Actions).");
  process.exit(1);
}

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
} finally {
  await sql.end();
}
