"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Anmeldeseite, Meldung } from "@/components/Anmeldeseite";
import { ersteinrichtungNoetig, MIN_PASSWORT_LAENGE, registrieren } from "@/lib/anmeldung";
import { useSitzung } from "@/lib/sitzung";

/** Legt den allerersten Zugang an (Rolle Inhaber). Funktioniert nur, solange es noch keinen Benutzer gibt. */
export default function EinrichtungSeite() {
  const router = useRouter();
  const { neuLaden } = useSitzung();
  const [fehler, setFehler] = useState<string>();
  const [erfolg, setErfolg] = useState<string>();
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => {
    ersteinrichtungNoetig()
      .then((noetig) => !noetig && router.replace("/login/"))
      .catch((e) => setFehler(e.message));
  }, [router]);

  async function anlegen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim().toLowerCase();
    const passwort = String(form.get("passwort"));
    setFehler(undefined);
    if (passwort.length < MIN_PASSWORT_LAENGE) return setFehler(`Das Passwort muss mindestens ${MIN_PASSWORT_LAENGE} Zeichen haben.`);
    if (passwort !== form.get("passwort2")) return setFehler("Die Passwörter stimmen nicht überein.");
    setLaeuft(true);
    try {
      if (await registrieren(email, passwort, { name })) {
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
    <Anmeldeseite titel="Ersteinrichtung">
      <p className="mb-4 text-sm text-slate-600">
        Lege den ersten Zugang an. Er bekommt die Rolle <strong>Inhaber</strong> und darf alles, auch weitere Mitarbeiter einladen.
      </p>
      <form onSubmit={anlegen} className="space-y-4">
        <Meldung fehler={fehler} erfolg={erfolg} />
        <div>
          <label className="feld-label" htmlFor="name">Name</label>
          <input className="eingabe" id="name" name="name" autoComplete="name" required />
        </div>
        <div>
          <label className="feld-label" htmlFor="email">E-Mail</label>
          <input className="eingabe" id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div>
          <label className="feld-label" htmlFor="passwort">Passwort (mind. 10 Zeichen)</label>
          <input className="eingabe" id="passwort" name="passwort" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        <div>
          <label className="feld-label" htmlFor="passwort2">Passwort wiederholen</label>
          <input className="eingabe" id="passwort2" name="passwort2" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        <button className="btn-primaer w-full" disabled={laeuft}>Zugang anlegen</button>
      </form>
    </Anmeldeseite>
  );
}
