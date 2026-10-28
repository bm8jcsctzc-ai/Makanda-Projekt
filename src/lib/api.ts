import { supabase } from "./supabase";

// Aufrufe der Datenbank-Funktionen (supabase/migrations/0002_funktionen.sql).
// Die Datenbank liefert snake_case, die App arbeitet mit camelCase und echten Date-Objekten für Zeitpunkte.

const ZEITPUNKT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
// Inhalte dieser Felder sind Zuordnungen (z. B. Prüfpunkt-ID → Antwort) und bleiben unverändert
const UNVERAENDERT = new Set(["antworten", "punkte"]);

const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_, z: string) => z.toUpperCase());
const snake = (s: string) => s.replace(/[A-Z]/g, (z) => `_${z.toLowerCase()}`);

export function zuCamel(wert: unknown): unknown {
  if (Array.isArray(wert)) return wert.map(zuCamel);
  if (typeof wert === "string" && ZEITPUNKT.test(wert)) return new Date(wert);
  if (wert && typeof wert === "object") {
    return Object.fromEntries(
      Object.entries(wert).map(([k, v]) => [camel(k), UNVERAENDERT.has(k) ? v : zuCamel(v)]),
    );
  }
  return wert;
}

/** Datensatz für die Datenbank: Feldnamen in snake_case, leere Texte als null */
export function zuSnake(daten: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(daten).map(([k, v]) => [snake(k), v === "" ? null : v]));
}

function meldung(fehler: { message?: string; code?: string }): string {
  const text = fehler.message ?? "Unbekannter Fehler";
  if (/Failed to fetch|NetworkError|Load failed/i.test(text)) return "Keine Verbindung. Bitte Internet prüfen und erneut versuchen.";
  if (/JWT|jwt/.test(text)) return "Deine Anmeldung ist abgelaufen. Bitte neu anmelden.";
  if (/permission denied/i.test(text)) return "Dafür fehlt die Berechtigung.";
  return text;
}

export class ApiFehler extends Error {}

export async function api<T = unknown>(funktion: string, argumente: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(funktion, argumente);
  if (error) throw new ApiFehler(meldung(error));
  return zuCamel(data) as T;
}

/** Fehlermeldung aus einem gefangenen Fehler */
export function fehlertext(e: unknown): string {
  return e instanceof Error ? meldung({ message: e.message }) : String(e);
}
