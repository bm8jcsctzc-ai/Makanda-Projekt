import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { count } from "drizzle-orm";
import { START_VORLAGEN } from "@/lib/checklisten-vorlagen";
import { STANDARD_BETREFF, STANDARD_TEXT } from "@/lib/wartungsplan";
import * as schema from "./schema";

// Ohne DATABASE_URL läuft eine eingebaute Postgres-Datenbank (PGlite) im Ordner ./data.
// Mit DATABASE_URL (z. B. Supabase) wird diese Datenbank verwendet.

const migrationsFolder = path.join(process.cwd(), "drizzle");

type Db = PostgresJsDatabase<typeof schema>;

async function verbinden(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const postgres = (await import("postgres")).default;
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder });
    await startdatenAnlegen(db);
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const ordner = path.join(process.cwd(), "data", "pglite");
  mkdirSync(ordner, { recursive: true });
  const db = drizzle(new PGlite(ordner), { schema });
  await migrate(db, { migrationsFolder });
  await startdatenAnlegen(db as unknown as Db);
  // PGlite und postgres-js haben dieselbe Abfrage-Schnittstelle.
  return db as unknown as Db;
}

/** Legt beim allerersten Start die Checklisten-Vorlagen und die Einstellungen an. */
async function startdatenAnlegen(db: Db) {
  const [{ anzahl }] = await db.select({ anzahl: count() }).from(schema.checklisteVorlage);
  if (anzahl === 0) await db.insert(schema.checklisteVorlage).values(START_VORLAGEN);
  await db
    .insert(schema.einstellungen)
    .values({ id: 1, erinnerungBetreff: STANDARD_BETREFF, erinnerungText: STANDARD_TEXT })
    .onConflictDoNothing();
}

// Eine Verbindung pro Prozess, auch wenn Next.js im Entwicklungsmodus Module neu lädt.
const globalFuerDb = globalThis as unknown as { dbPromise?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalFuerDb.dbPromise ??= verbinden();
  return globalFuerDb.dbPromise;
}

export { schema };
