import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

// Postgres im Arbeitsspeicher mit nachgebauter Supabase-Umgebung und allen Migrationen.
// Grundlage für die Datenbank-Tests und die lokale Supabase-Attrappe.

const ORDNER = path.join(__dirname, "..");

export async function neueDatenbank(datenordner?: string): Promise<PGlite> {
  const db = await PGlite.create({ dataDir: datenordner, extensions: { pgcrypto } });
  const schonDa = await db.query<{ da: boolean }>("select to_regclass('auth.users') is not null as da");
  if (!schonDa.rows[0].da) {
    await db.exec(readFileSync(path.join(ORDNER, "test", "attrappe.sql"), "utf8"));
    await db.exec("create schema if not exists intern; create table if not exists intern.migrationen (name text primary key, angewendet_am timestamptz default now())");
  }
  for (const datei of readdirSync(path.join(ORDNER, "migrations")).filter((d) => d.endsWith(".sql")).sort()) {
    const fertig = await db.query("select 1 from intern.migrationen where name = $1", [datei]);
    if (fertig.rows.length) continue;
    await db.transaction(async (tx) => {
      await tx.exec(readFileSync(path.join(ORDNER, "migrations", datei), "utf8"));
      await tx.query("insert into intern.migrationen (name) values ($1)", [datei]);
    });
  }
  return db;
}

export type Fehler = Error & { code?: string };

/** Führt eine Abfrage als angemeldeter Benutzer (oder anonym bei null) aus – wie PostgREST in Supabase */
export async function als<T>(db: PGlite, benutzerId: string | null, abfrage: (tx: Parameters<Parameters<PGlite["transaction"]>[0]>[0]) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${benutzerId ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(benutzerId ? { sub: benutzerId, role: "authenticated" } : { role: "anon" }),
    ]);
    return abfrage(tx);
  });
}

const signaturen = new Map<string, { name: string; typ: string }[]>();

/** Ruft eine Schnittstellen-Funktion mit benannten Parametern auf (wie supabase.rpc) */
export async function rpc<T = unknown>(db: PGlite, benutzerId: string | null, name: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!/^[a-z_]+$/.test(name)) throw new Error("Ungültiger Funktionsname");
  if (!signaturen.has(name)) {
    const r = await db.query<{ namen: string[] | null; typen: string }>(
      `select proargnames as namen, array_to_string(proargtypes::regtype[], ',') as typen
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1`,
      [name],
    );
    if (!r.rows.length) throw new Error(`Funktion ${name} gibt es nicht`);
    const typen = r.rows[0].typen ? r.rows[0].typen.split(",") : [];
    signaturen.set(name, (r.rows[0].namen ?? []).map((n, i) => ({ name: n, typ: typen[i] })));
  }
  const parameter = signaturen.get(name)!.filter((p) => p.name in args);
  const unbekannt = Object.keys(args).filter((a) => !signaturen.get(name)!.some((p) => p.name === a));
  if (unbekannt.length) throw new Error(`Unbekannte Parameter für ${name}: ${unbekannt.join(", ")}`);
  const sql = `select public.${name}(${parameter.map((p, i) => `${p.name} => $${i + 1}::${p.typ}`).join(", ")}) as ergebnis`;
  const werte = parameter.map((p) => {
    const w = args[p.name];
    if (w == null) return null;
    return typeof w === "object" ? JSON.stringify(w) : w;
  });
  return als(db, benutzerId, async (tx) => (await tx.query<{ ergebnis: T }>(sql, werte)).rows[0].ergebnis);
}

/** Registrierung wie bei Supabase Auth: legt den Login an, der Trigger erzeugt ggf. das Profil */
export async function registrieren(db: PGlite, email: string, daten: Record<string, string> = {}): Promise<string> {
  const r = await db.query<{ id: string }>("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [
    email.toLowerCase(),
    JSON.stringify(daten),
  ]);
  return r.rows[0].id;
}
