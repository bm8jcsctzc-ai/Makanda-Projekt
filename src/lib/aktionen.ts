/** Rückgabe einer Server-Aktion an ein Formular: Fehlermeldung oder nichts */
export type FormularZustand = { fehler?: string; erfolg?: string } | undefined;

export function text(form: FormData, feld: string): string {
  const wert = form.get(feld);
  return typeof wert === "string" ? wert.trim() : "";
}

export function optionalerText(form: FormData, feld: string): string | null {
  return text(form, feld) || null;
}

export function istDatum(wert: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(wert) && !Number.isNaN(Date.parse(wert));
}

export function istUuid(wert: string | undefined | null): wert is string {
  return !!wert && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(wert);
}
