// Lokaler Nachbau von Supabase (Anmeldung, Datenbank-Schnittstelle, Dateispeicher) für Entwicklung und Tests.
// Läuft komplett auf diesem Rechner mit PGlite – ohne Supabase-Konto.
//
//   npx tsx scripts/supabase-attrappe.mts            → Supabase-Nachbau auf http://localhost:54321
//   ATTRAPPE_APP=out npx tsx scripts/supabase-attrappe.mts              → zusätzlich die gebaute App (Ordner out) auf http://localhost:3100
//   ATTRAPPE_BASIS=/Makanda-Projekt …              → App unter Unterpfad wie auf GitHub Pages
//   ATTRAPPE_DATEN=./data/attrappe npx tsx …         → Daten bleiben nach dem Beenden erhalten
//
// Nur für Tests gedacht: Passwörter werden einfach gehasht, E-Mails nicht bestätigt.

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { jwtVerify, SignJWT } from "jose";
import { erinnerungenVorbereiten, warteschlangeAbarbeiten, wochenberichtSenden, type Db } from "../src/lib/automatik.ts";
import { heute } from "../src/lib/format.ts";
import { als, neueDatenbank, rpc } from "../supabase/test/datenbank.ts";

const PORT = Number(process.env.ATTRAPPE_PORT ?? 54321);
const APP_PORT = Number(process.env.ATTRAPPE_APP_PORT ?? 3100);
const GEHEIM = new TextEncoder().encode("nur-fuer-die-lokale-attrappe");
const BUCKET = "dateien";

const db = await neueDatenbank(process.env.ATTRAPPE_DATEN);

// PGlite hat nur eine Verbindung: Anfragen nacheinander abarbeiten
let kette: Promise<unknown> = Promise.resolve();
function nacheinander<T>(arbeit: () => Promise<T>): Promise<T> {
  const ergebnis = kette.then(arbeit, arbeit);
  kette = ergebnis.catch(() => {});
  return ergebnis;
}

// ---------------------------------------------------------------- Automatik (in Supabase: GitHub Actions)

const automatikDb: Db = { abfrage: async (sql, werte) => (await db.query(sql, werte)).rows as never };
const testmodus = async () => ({ status: "testmodus" as const });

/** POST /attrappe/aufgaben/erinnerungen | wochenbericht | mails – wie scripts/aufgaben.mts im Testmodus */
async function aufgabe(res: ServerResponse, url: URL) {
  const name = url.pathname.split("/").pop();
  const tag = url.searchParams.get("heute") ?? heute();
  let meldung: string;
  if (name === "erinnerungen") meldung = await erinnerungenVorbereiten(automatikDb, tag);
  else if (name === "wochenbericht") meldung = await wochenberichtSenden(automatikDb, tag, testmodus);
  else if (name === "mails") meldung = await warteschlangeAbarbeiten(automatikDb, testmodus);
  else return json(res, 404, { message: "Unbekannte Aufgabe" });
  json(res, 200, { meldung });
}

// ---------------------------------------------------------------- Hilfen

function lesen(req: IncomingMessage): Promise<Buffer> {
  return new Promise((ok, fehler) => {
    const teile: Buffer[] = [];
    req.on("data", (t) => teile.push(t));
    req.on("end", () => ok(Buffer.concat(teile)));
    req.on("error", fehler);
  });
}

function json(res: ServerResponse, status: number, daten: unknown) {
  if (status === 204) {
    res.writeHead(204);
    return res.end();
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(daten));
}

// Passwörter wie in Supabase mit bcrypt (pgcrypto) – so passen sie auch zu public.passwort_setzen
async function hash(passwort: string) {
  const r = await db.query<{ h: string }>("select extensions.crypt($1, extensions.gen_salt('bf', 4)) as h", [passwort]);
  return r.rows[0].h;
}

async function passwortStimmt(passwort: string, gespeichert: string | null) {
  if (!gespeichert) return false;
  const r = await db.query<{ ok: boolean }>("select extensions.crypt($1, $2) = $2 as ok", [passwort, gespeichert]);
  return r.rows[0].ok;
}

type AuthBenutzer = { id: string; email: string; raw_user_meta_data: Record<string, unknown>; created_at: string };

function benutzerAntwort(u: AuthBenutzer) {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.created_at,
    user_metadata: u.raw_user_meta_data,
    app_metadata: { provider: "email", providers: ["email"] },
    created_at: u.created_at,
  };
}

const auffrischen = new Map<string, string>();

async function sitzung(u: AuthBenutzer) {
  const dauer = 3600;
  const access_token = await new SignJWT({ role: "authenticated", aud: "authenticated", email: u.email, session_id: randomUUID() })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(u.id)
    .setIssuedAt()
    .setExpirationTime(`${dauer}s`)
    .sign(GEHEIM);
  const refresh_token = randomBytes(16).toString("hex");
  auffrischen.set(refresh_token, u.id);
  return {
    access_token,
    token_type: "bearer",
    expires_in: dauer,
    expires_at: Math.floor(Date.now() / 1000) + dauer,
    refresh_token,
    user: benutzerAntwort(u),
  };
}

/** Benutzer-ID aus dem Anmelde-Token; null für anonyme Aufrufe (nur API-Schlüssel) */
async function wer(req: IncomingMessage): Promise<string | null> {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, GEHEIM);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

async function authBenutzer(feld: "id" | "email", wert: string): Promise<(AuthBenutzer & { encrypted_password: string | null }) | undefined> {
  const r = await db.query<AuthBenutzer & { encrypted_password: string | null }>(
    `select id, email, raw_user_meta_data, created_at, encrypted_password from auth.users where ${feld} = $1`,
    [wert],
  );
  return r.rows[0];
}

const authFehler = (res: ServerResponse, status: number, code: string, msg: string) =>
  json(res, status, { code: status, error_code: code, msg });

// ---------------------------------------------------------------- Anmeldung (/auth/v1)

async function auth(req: IncomingMessage, res: ServerResponse, url: URL, body: Buffer) {
  const daten = body.length ? JSON.parse(body.toString()) : {};
  const route = url.pathname.replace("/auth/v1", "");

  if (req.method === "POST" && route === "/signup") {
    const email = String(daten.email ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return authFehler(res, 400, "validation_failed", "Unable to validate email address: invalid format");
    if (String(daten.password ?? "").length < 6) return authFehler(res, 422, "weak_password", "Password should be at least 6 characters.");
    if (await authBenutzer("email", email)) return authFehler(res, 422, "user_already_exists", "User already registered");
    const r = await db.query<AuthBenutzer>(
      "insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1, $2, $3) returning id, email, raw_user_meta_data, created_at",
      [email, await hash(daten.password), JSON.stringify(daten.data ?? {})],
    );
    return json(res, 200, await sitzung(r.rows[0]));
  }

  if (req.method === "POST" && route === "/token") {
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const id = auffrischen.get(daten.refresh_token);
      const u = id && (await authBenutzer("id", id));
      if (!u) return authFehler(res, 400, "refresh_token_not_found", "Invalid Refresh Token: Refresh Token Not Found");
      auffrischen.delete(daten.refresh_token);
      return json(res, 200, await sitzung(u));
    }
    const u = await authBenutzer("email", String(daten.email ?? "").trim().toLowerCase());
    if (!u || !(await passwortStimmt(String(daten.password ?? ""), u.encrypted_password))) {
      return authFehler(res, 400, "invalid_credentials", "Invalid login credentials");
    }
    return json(res, 200, await sitzung(u));
  }

  const id = await wer(req);
  if (route === "/user") {
    const u = id && (await authBenutzer("id", id));
    if (!u) return authFehler(res, 401, "bad_jwt", "invalid JWT");
    if (req.method === "PUT" && daten.password) {
      if (String(daten.password).length < 6) return authFehler(res, 422, "weak_password", "Password should be at least 6 characters.");
      await db.query("update auth.users set encrypted_password = $1 where id = $2", [await hash(daten.password), id]);
    }
    return json(res, 200, benutzerAntwort(u));
  }
  if (req.method === "POST" && route === "/logout") return json(res, 204, null);
  if (req.method === "POST" && route === "/recover") return json(res, 200, {});
  return authFehler(res, 404, "not_found", "Not found");
}

// ---------------------------------------------------------------- Datenbank-Schnittstelle (/rest/v1/rpc)

async function rest(req: IncomingMessage, res: ServerResponse, url: URL, body: Buffer) {
  const m = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
  if (!m || req.method !== "POST") return json(res, 404, { message: "Nur Funktionsaufrufe (rpc) werden unterstützt" });
  const benutzer = await wer(req);
  try {
    const ergebnis = await rpc(db, benutzer, m[1], body.length ? JSON.parse(body.toString()) : {});
    return ergebnis === undefined ? json(res, 204, null) : json(res, 200, ergebnis);
  } catch (e) {
    const f = e as Error & { code?: string };
    const status = f.code === "42501" ? (benutzer ? 403 : 401) : f.code === "28000" ? 403 : 400;
    return json(res, status, { code: f.code ?? "P0001", message: f.message, details: null, hint: null });
  }
}

// ---------------------------------------------------------------- Dateispeicher (/storage/v1)

const speicherFehler = (res: ServerResponse, status: number, message: string) =>
  json(res, status, { statusCode: String(status), error: status === 404 ? "not_found" : "Unauthorized", message });

async function signieren(pfad: string, sekunden: number) {
  const token = await new SignJWT({ url: `${BUCKET}/${pfad}` })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${sekunden}s`)
    .sign(GEHEIM);
  return `/object/sign/${BUCKET}/${pfad}?token=${token}`;
}

async function speicher(req: IncomingMessage, res: ServerResponse, url: URL, body: Buffer) {
  const route = decodeURIComponent(url.pathname.replace("/storage/v1", ""));
  const benutzer = await wer(req);

  // Signierte Adresse abrufen: der Token selbst ist die Berechtigung
  let m = route.match(/^\/object\/sign\/dateien\/(.+)$/);
  if (req.method === "GET" && m) {
    try {
      const { payload } = await jwtVerify(url.searchParams.get("token") ?? "", GEHEIM);
      if (payload.url !== `${BUCKET}/${m[1]}`) throw new Error();
    } catch {
      return speicherFehler(res, 400, "Invalid signature");
    }
    const r = await db.query<{ inhalt: Uint8Array; mime_type: string }>(
      "select inhalt, mime_type from storage.objects where bucket_id = $1 and name = $2",
      [BUCKET, m[1]],
    );
    if (!r.rows.length) return speicherFehler(res, 404, "Object not found");
    res.writeHead(200, { "Content-Type": r.rows[0].mime_type, "Cache-Control": "private, max-age=60" });
    return res.end(Buffer.from(r.rows[0].inhalt));
  }

  if (!benutzer) return speicherFehler(res, 403, "Invalid JWT");

  if (req.method === "POST" && route === "/object/sign/dateien") {
    const { paths, expiresIn } = JSON.parse(body.toString());
    const sichtbar = await als(db, benutzer, (tx) =>
      tx.query<{ name: string }>("select name from storage.objects where bucket_id = $1 and name = any($2)", [BUCKET, paths]),
    );
    const erlaubt = new Set(sichtbar.rows.map((r) => r.name));
    return json(
      res,
      200,
      await Promise.all(
        (paths as string[]).map(async (p) =>
          erlaubt.has(p) ? { path: p, signedURL: await signieren(p, expiresIn), error: null } : { path: p, signedURL: null, error: "Either the object does not exist or you do not have access to it" },
        ),
      ),
    );
  }

  m = route.match(/^\/object\/sign\/dateien\/(.+)$/);
  if (req.method === "POST" && m) {
    const pfad = m[1];
    const sichtbar = await als(db, benutzer, (tx) =>
      tx.query("select 1 from storage.objects where bucket_id = $1 and name = $2", [BUCKET, pfad]),
    );
    if (!sichtbar.rows.length) return speicherFehler(res, 400, "Object not found");
    return json(res, 200, { signedURL: await signieren(pfad, JSON.parse(body.toString()).expiresIn) });
  }

  m = route.match(/^\/object\/dateien\/(.+)$/);
  if (req.method === "POST" && m) {
    const typ = String(req.headers["content-type"] ?? "");
    const b = (await db.query<{ file_size_limit: number; allowed_mime_types: string[] }>("select * from storage.buckets where id = $1", [BUCKET])).rows[0];
    if (!b) return speicherFehler(res, 404, "Bucket not found");
    if (b.allowed_mime_types && !b.allowed_mime_types.includes(typ)) return speicherFehler(res, 415, `mime type ${typ} is not supported`);
    if (b.file_size_limit && body.length > b.file_size_limit) return speicherFehler(res, 413, "The object exceeded the maximum allowed size");
    try {
      const r = await als(db, benutzer, (tx) =>
        tx.query<{ id: string }>("insert into storage.objects (bucket_id, name, mime_type, inhalt) values ($1, $2, $3, $4) returning id", [
          BUCKET,
          m![1],
          typ,
          body,
        ]),
      );
      return json(res, 200, { Id: r.rows[0].id, Key: `${BUCKET}/${m[1]}` });
    } catch (e) {
      const text = (e as Error).message;
      if (/duplicate key/.test(text)) return speicherFehler(res, 409, "The resource already exists");
      return speicherFehler(res, 403, "new row violates row-level security policy");
    }
  }

  if (req.method === "DELETE" && route === "/object/dateien") {
    const { prefixes } = JSON.parse(body.toString());
    const r = await als(db, benutzer, (tx) =>
      tx.query<{ name: string }>("delete from storage.objects where bucket_id = $1 and name = any($2) returning name", [BUCKET, prefixes]),
    );
    return json(res, 200, r.rows.map((x) => ({ name: x.name, bucket_id: BUCKET })));
  }

  return speicherFehler(res, 404, "Not found");
}

// ---------------------------------------------------------------- Server

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, x-upsert, cache-control, prefer, accept-profile, content-profile, x-supabase-api-version, x-metadata");
  if (req.method === "OPTIONS") return json(res, 204, null);
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const body = await lesen(req);
    await nacheinander(async () => {
      if (url.pathname.startsWith("/auth/v1")) return auth(req, res, url, body);
      if (url.pathname.startsWith("/rest/v1")) return rest(req, res, url, body);
      if (url.pathname.startsWith("/storage/v1")) return speicher(req, res, url, body);
      if (url.pathname.startsWith("/attrappe/aufgaben/")) return aufgabe(res, url);
      return json(res, 404, { message: "Not found" });
    });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, 500, { message: (e as Error).message });
  }
}).listen(PORT, () => console.log(`Supabase-Attrappe läuft auf http://localhost:${PORT}`));

// Gebaute App ausliefern (wie GitHub Pages: /pfad → /pfad/index.html)
const APP = process.env.ATTRAPPE_APP;
const BASIS = process.env.ATTRAPPE_BASIS ?? "";
if (APP) {
  const wurzel = path.resolve(APP);
  const typen: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".txt": "text/plain",
    ".webmanifest": "application/manifest+json",
  };
  createServer((req, res) => {
    let pfad = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    // Wie auf GitHub Pages unter /<Projektname>/ (ATTRAPPE_BASIS=/Makanda-Projekt)
    if (BASIS) {
      if (!pfad.startsWith(BASIS)) return json(res, 404, {});
      pfad = pfad.slice(BASIS.length) || "/";
    }
    let datei = path.join(wurzel, pfad);
    if (!datei.startsWith(wurzel)) return json(res, 403, {});
    if (existsSync(datei) && statSync(datei).isDirectory()) {
      if (!pfad.endsWith("/")) {
        const ziel = new URL(req.url ?? "/", "http://x");
        res.writeHead(301, { Location: `${ziel.pathname}/${ziel.search}` });
        return res.end();
      }
      datei = path.join(datei, "index.html");
    }
    if (!existsSync(datei) && existsSync(`${datei}.html`)) datei = `${datei}.html`;
    if (!existsSync(datei)) datei = path.join(wurzel, "404.html");
    const inhalt = readFileSync(datei);
    res.writeHead(datei.endsWith("404.html") && !pfad.endsWith("404.html") ? 404 : 200, {
      "Content-Type": typen[path.extname(datei)] ?? "application/octet-stream",
      ETag: createHash("md5").update(inhalt).digest("hex"),
    });
    res.end(inhalt);
  }).listen(APP_PORT, () => console.log(`App läuft auf http://localhost:${APP_PORT}`));
}
