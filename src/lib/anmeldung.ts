import { api } from "./api";
import { supabase } from "./supabase";

export const MIN_PASSWORT_LAENGE = 10;

function basis() {
  return `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}`;
}

export function anmeldeFehler(text: string): string {
  if (/Invalid login credentials/i.test(text)) return "E-Mail oder Passwort ist falsch.";
  if (/Email not confirmed/i.test(text)) return "Bitte bestätige zuerst deine E-Mail-Adresse über den Link in der E-Mail von Supabase.";
  if (/already registered|already exists/i.test(text)) return "Für diese E-Mail gibt es schon einen Zugang. Bitte anmelden.";
  if (/rate limit/i.test(text)) return "Zu viele Versuche. Bitte in ein paar Minuten erneut versuchen.";
  if (/Password should/i.test(text)) return `Das Passwort ist zu kurz oder zu einfach (mind. ${MIN_PASSWORT_LAENGE} Zeichen).`;
  if (/fetch/i.test(text)) return "Keine Verbindung. Bitte Internet prüfen.";
  return text;
}

/** Registrierung; liefert true, wenn direkt angemeldet, false, wenn erst die E-Mail bestätigt werden muss */
export async function registrieren(email: string, passwort: string, daten: Record<string, string>): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: passwort,
    options: { data: daten, emailRedirectTo: `${basis()}/login/` },
  });
  if (error) throw new Error(anmeldeFehler(error.message));
  return Boolean(data.session);
}

export async function passwortVergessen(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${basis()}/konto/` });
  if (error) throw new Error(anmeldeFehler(error.message));
}

export const ersteinrichtungNoetig = () => api<boolean>("ersteinrichtung_noetig");
