import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { benutzer, einstellungen, type Benutzer, type Rolle } from "@/db/schema";

const COOKIE = "sitzung";
const LAUFZEIT_TAGE = 30;

// Schlüssel für die Anmelde-Cookies: aus SESSION_SECRET, sonst einmalig erzeugt und in der Datenbank gespeichert.
// So muss beim Online-Stellen niemand einen Schlüssel von Hand eintragen.
let schluessel: Promise<Uint8Array> | undefined;

async function ladeSchluessel(): Promise<Uint8Array> {
  if (process.env.SESSION_SECRET) return new TextEncoder().encode(process.env.SESSION_SECRET);
  const db = await getDb();
  await db
    .update(einstellungen)
    .set({ sitzungsSchluessel: randomBytes(32).toString("hex") })
    .where(and(eq(einstellungen.id, 1), isNull(einstellungen.sitzungsSchluessel)));
  const [e] = await db.select({ s: einstellungen.sitzungsSchluessel }).from(einstellungen).where(eq(einstellungen.id, 1));
  return new TextEncoder().encode(e.s!);
}

function geheimnis(): Promise<Uint8Array> {
  schluessel ??= ladeSchluessel().catch((fehler) => {
    schluessel = undefined;
    throw fehler;
  });
  return schluessel;
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
    .sign(await geheimnis());
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
  const schluessel = await geheimnis();
  let benutzerId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, schluessel);
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
