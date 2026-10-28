import { supabase } from "./supabase";
import { zuCamel } from "./umwandeln";

// Aufrufe der Datenbank-Funktionen (supabase/migrations/0002_funktionen.sql).

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
