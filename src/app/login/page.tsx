"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Anmeldeseite, Meldung } from "@/components/Anmeldeseite";
import { anmeldeFehler, ersteinrichtungNoetig, passwortVergessen } from "@/lib/anmeldung";
import { useSitzung } from "@/lib/sitzung";
import { supabase, supabaseEingerichtet } from "@/lib/supabase";

export default function LoginSeite() {
  const router = useRouter();
  const { profil, angemeldet, laedt, neuLaden, abmelden } = useSitzung();
  const [fehler, setFehler] = useState<string>();
  const [erfolg, setErfolg] = useState<string>();
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => {
    if (!supabaseEingerichtet) return;
    if (!laedt && profil) router.replace("/");
    ersteinrichtungNoetig()
      .then((noetig) => noetig && router.replace("/einrichtung/"))
      .catch(() => {});
  }, [laedt, profil, router]);

  if (!supabaseEingerichtet) {
    return (
      <Anmeldeseite titel="Noch nicht eingerichtet">
        <p className="text-sm text-slate-600">Die Verbindung zu Supabase fehlt noch. Siehe Anleitung docs/ONLINE.md.</p>
      </Anmeldeseite>
    );
  }

  if (!laedt && angemeldet && !profil) {
    return (
      <Anmeldeseite titel="Noch nicht freigeschaltet">
        <p className="mb-4 text-sm text-slate-600">
          Du bist angemeldet, aber dein Zugang ist (noch) nicht freigeschaltet oder wurde deaktiviert. Bitte wende dich an den Inhaber.
        </p>
        <button className="btn w-full" onClick={abmelden}>Abmelden</button>
      </Anmeldeseite>
    );
  }

  async function anmelden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setFehler(undefined);
    setLaeuft(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")).trim().toLowerCase(),
      password: String(form.get("passwort")),
    });
    if (error) {
      setFehler(anmeldeFehler(error.message));
      setLaeuft(false);
      return;
    }
    await neuLaden();
    router.replace("/");
  }

  async function vergessen() {
    const email = (document.getElementById("email") as HTMLInputElement).value.trim();
    if (!email) return setFehler("Bitte zuerst deine E-Mail-Adresse eintragen.");
    try {
      await passwortVergessen(email);
      setErfolg("Falls es diesen Zugang gibt, kommt gleich eine E-Mail mit einem Link zum Zurücksetzen.");
    } catch (err) {
      setFehler((err as Error).message);
    }
  }

  return (
    <Anmeldeseite titel="Anmelden">
      <form onSubmit={anmelden} className="space-y-4">
        <Meldung fehler={fehler} erfolg={erfolg} />
        <div>
          <label className="feld-label" htmlFor="email">E-Mail</label>
          <input className="eingabe" id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div>
          <label className="feld-label" htmlFor="passwort">Passwort</label>
          <input className="eingabe" id="passwort" name="passwort" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn-primaer w-full" disabled={laeuft}>{laeuft ? "Anmelden …" : "Anmelden"}</button>
      </form>
      <div className="mt-4 flex flex-col gap-2 text-sm">
        <Link className="text-marke underline" href="/registrieren/">Neu hier? Mit Einladungscode registrieren</Link>
        <button type="button" className="text-left text-slate-600 underline" onClick={vergessen}>Passwort vergessen?</button>
      </div>
    </Anmeldeseite>
  );
}
