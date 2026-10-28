"use client";

import Link from "next/link";
import { useState } from "react";
import { Anmeldeseite, Meldung } from "@/components/Anmeldeseite";
import { anmeldeFehler, MIN_PASSWORT_LAENGE } from "@/lib/anmeldung";
import { useSitzung } from "@/lib/sitzung";
import { supabase } from "@/lib/supabase";

/** Eigenes Passwort ändern – auch Ziel des Links „Passwort vergessen“ */
export default function KontoSeite() {
  const { profil, angemeldet, laedt } = useSitzung();
  const [fehler, setFehler] = useState<string>();
  const [erfolg, setErfolg] = useState<string>();

  async function aendern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const passwort = String(form.get("passwort"));
    setFehler(undefined);
    if (passwort.length < MIN_PASSWORT_LAENGE) return setFehler(`Das Passwort muss mindestens ${MIN_PASSWORT_LAENGE} Zeichen haben.`);
    if (passwort !== form.get("passwort2")) return setFehler("Die Passwörter stimmen nicht überein.");
    const { error } = await supabase.auth.updateUser({ password: passwort });
    if (error) return setFehler(anmeldeFehler(error.message));
    setErfolg("Dein neues Passwort ist gespeichert.");
    e.currentTarget.reset();
  }

  if (!laedt && !angemeldet) {
    return (
      <Anmeldeseite titel="Mein Zugang">
        <p className="text-sm">Bitte zuerst <Link className="text-marke underline" href="/login/">anmelden</Link>.</p>
      </Anmeldeseite>
    );
  }

  return (
    <Anmeldeseite titel="Passwort ändern">
      {profil && <p className="mb-4 text-sm text-slate-600">{profil.name} · {profil.email}</p>}
      <form onSubmit={aendern} className="space-y-4">
        <Meldung fehler={fehler} erfolg={erfolg} />
        <div>
          <label className="feld-label" htmlFor="passwort">Neues Passwort (mind. 10 Zeichen)</label>
          <input className="eingabe" id="passwort" name="passwort" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        <div>
          <label className="feld-label" htmlFor="passwort2">Wiederholen</label>
          <input className="eingabe" id="passwort2" name="passwort2" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        <button className="btn-primaer w-full">Speichern</button>
      </form>
      <p className="mt-4 text-sm"><Link className="text-marke underline" href="/">← zur App</Link></p>
    </Anmeldeseite>
  );
}
