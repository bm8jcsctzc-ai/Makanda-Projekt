"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Anmeldeseite, Meldung } from "@/components/Anmeldeseite";
import { api } from "@/lib/api";
import { MIN_PASSWORT_LAENGE, registrieren } from "@/lib/anmeldung";
import { useSitzung } from "@/lib/sitzung";

/** Registrierung für eingeladene Mitarbeiter: E-Mail und Code bekommen sie vom Inhaber */
export default function RegistrierenSeite() {
  const router = useRouter();
  const { neuLaden } = useSitzung();
  const [fehler, setFehler] = useState<string>();
  const [erfolg, setErfolg] = useState<string>();
  const [laeuft, setLaeuft] = useState(false);

  async function absenden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim().toLowerCase();
    const code = String(form.get("code")).trim().toUpperCase();
    const passwort = String(form.get("passwort"));
    setFehler(undefined);
    if (passwort.length < MIN_PASSWORT_LAENGE) return setFehler(`Das Passwort muss mindestens ${MIN_PASSWORT_LAENGE} Zeichen haben.`);
    if (passwort !== form.get("passwort2")) return setFehler("Die Passwörter stimmen nicht überein.");
    setLaeuft(true);
    try {
      if (!(await api<boolean>("einladung_pruefen", { p_email: email, p_code: code }))) {
        throw new Error("E-Mail-Adresse oder Einladungscode stimmen nicht. Bitte beim Inhaber nachfragen.");
      }
      if (await registrieren(email, passwort, { einladungscode: code })) {
        await neuLaden();
        router.replace("/");
      } else {
        setErfolg("Fast geschafft: Bitte bestätige deine E-Mail-Adresse über den Link in der E-Mail und melde dich dann an.");
      }
    } catch (err) {
      setFehler((err as Error).message);
    }
    setLaeuft(false);
  }

  return (
    <Anmeldeseite titel="Registrieren">
      <p className="mb-4 text-sm text-slate-600">Den Einladungscode bekommst du vom Inhaber.</p>
      <form onSubmit={absenden} className="space-y-4">
        <Meldung fehler={fehler} erfolg={erfolg} />
        <div>
          <label className="feld-label" htmlFor="email">E-Mail</label>
          <input className="eingabe" id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div>
          <label className="feld-label" htmlFor="code">Einladungscode</label>
          <input className="eingabe uppercase" id="code" name="code" autoComplete="one-time-code" required />
        </div>
        <div>
          <label className="feld-label" htmlFor="passwort">Passwort (mind. 10 Zeichen)</label>
          <input className="eingabe" id="passwort" name="passwort" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        <div>
          <label className="feld-label" htmlFor="passwort2">Passwort wiederholen</label>
          <input className="eingabe" id="passwort2" name="passwort2" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        <button className="btn-primaer w-full" disabled={laeuft}>Registrieren</button>
      </form>
      <p className="mt-4 text-sm"><Link className="text-marke underline" href="/login/">Schon registriert? Anmelden</Link></p>
    </Anmeldeseite>
  );
}
