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
