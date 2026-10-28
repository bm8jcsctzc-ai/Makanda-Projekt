import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { benutzer, type Benutzer, type Rolle } from "@/db/schema";

const COOKIE = "sitzung";
const LAUFZEIT_TAGE = 30;

// SESSION_SECRET setzen wir im Live-Betrieb. Lokal wird ein Schlüssel erzeugt und in ./data abgelegt.
function geheimnis(): Uint8Array {
  let wert = process.env.SESSION_SECRET;
  if (!wert) {
    const datei = path.join(process.cwd(), "data", ".sitzung-schluessel");
    if (!existsSync(datei)) {
      mkdirSync(path.dirname(datei), { recursive: true });
      writeFileSync(datei, randomBytes(32).toString("hex"), { mode: 0o600 });
    }
    wert = readFileSync(datei, "utf8");
  }
  return new TextEncoder().encode(wert);
}

export function hashePasswort(passwort: string) {
  return bcrypt.hash(passwort, 12);
}

export function pruefePasswort(passwort: string, hash: string) {
  return bcrypt.compare(passwort, hash);
}

export async function starteSitzung(benutzerId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(benutzerId)
    .setIssuedAt()
    .setExpirationTime(`${LAUFZEIT_TAGE}d`)
    .sign(geheimnis());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LAUFZEIT_TAGE * 24 * 60 * 60,
  });
}

export async function beendeSitzung() {
  (await cookies()).delete(COOKIE);
}

export async function aktuellerBenutzer(): Promise<Benutzer | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let benutzerId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, geheimnis());
    benutzerId = payload.sub;
  } catch {
    return null;
  }
  if (!benutzerId) return null;
  const db = await getDb();
  const [gefunden] = await db.select().from(benutzer).where(eq(benutzer.id, benutzerId));
  return gefunden?.aktiv ? gefunden : null;
}

/** Für Seiten und Aktionen: leitet zum Login, wenn niemand angemeldet ist, und zur Startseite, wenn die Rolle nicht passt. */
export async function benoetigeBenutzer(erlaubteRollen?: Rolle[]): Promise<Benutzer> {
  const b = await aktuellerBenutzer();
  if (!b) redirect("/login");
  if (erlaubteRollen && !erlaubteRollen.includes(b.rolle)) redirect("/");
  return b;
}

export const ROLLEN_NAMEN: Record<Rolle, string> = {
  inhaber: "Inhaber",
  buero: "Büro",
  monteur: "Monteur",
};

// Wer was im Bereich Finanzen darf
export const DARF_FINANZEN: Rolle[] = ["inhaber", "buero"];
export const DARF_GEHAELTER: Rolle[] = ["inhaber"];
export const DARF_BENUTZER: Rolle[] = ["inhaber"];
