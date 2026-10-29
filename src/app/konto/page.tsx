"use client";

import Link from "next/link";
import { useState } from "react";
import { Anmeldeseite, Meldung } from "@/components/Anmeldeseite";
import { api, fehlertext } from "@/lib/api";
import { anmeldeFehler, MIN_PASSWORT_LAENGE } from "@/lib/anmeldung";
import { useSitzung } from "@/lib/sitzung";
import { supabase } from "@/lib/supabase";

/** Eigenen Namen und eigenes Passwort ändern – auch Ziel des Links „Passwort vergessen“ */
export default function KontoSeite() {
  const { profil, angemeldet, laedt, neuLaden } = useSitzung();
  const [fehler, setFehler] = useState<string>();
  const [erfolg, setErfolg] = useState<string>();
  const [nameMeldung, setNameMeldung] = useState<{ fehler?: string; erfolg?: string }>({});

  async function nameAendern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name")).trim();
    try {
      await api("mein_name_aendern", { p_name: name });
      await neuLaden();
      setNameMeldung({ erfolg: "Dein Name ist gespeichert." });
    } catch (fehler) {
      setNameMeldung({ fehler: fehlertext(fehler) });
    }
  }

  async function aendern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formular = e.currentTarget;
    const form = new FormData(formular);
    const passwort = String(form.get("passwort"));
    setFehler(undefined);
    if (passwort.length < MIN_PASSWORT_LAENGE) return setFehler(`Das Passwort muss mindestens ${MIN_PASSWORT_LAENGE} Zeichen haben.`);
    if (passwort !== form.get("passwort2")) return setFehler("Die Passwörter stimmen nicht überein.");
    const { error } = await supabase.auth.updateUser({ password: passwort });
    if (error) return setFehler(anmeldeFehler(error.message));
    setErfolg("Dein neues Passwort ist gespeichert.");
    formular.reset();
  }

  if (!laedt && !angemeldet) {
    return (
      <Anmeldeseite titel="Mein Zugang">
        <p className="text-sm">Bitte zuerst <Link className="text-marke underline" href="/login/">anmelden</Link>.</p>
      </Anmeldeseite>
    );
  }

  return (
    <Anmeldeseite titel="Mein Konto">
      {profil && (
        <form onSubmit={nameAendern} className="mb-6 space-y-3 border-b border-slate-200 pb-6">
          <Meldung fehler={nameMeldung.fehler} erfolg={nameMeldung.erfolg} />
          <div>
            <label className="feld-label" htmlFor="name">Mein Name</label>
            <input className="eingabe" id="name" name="name" defaultValue={profil.name} autoComplete="name" required />
          </div>
          <p className="text-sm text-slate-600">
            Anmelde-E-Mail: {profil.email}
            <br />
            <span className="text-xs text-slate-500">Eine neue E-Mail-Adresse trägt der Inhaber unter Einstellungen › Benutzer ein.</span>
          </p>
          <button className="btn w-full">Name speichern</button>
        </form>
      )}
      <h2 className="mb-3 font-semibold">Passwort ändern</h2>
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
        <button className="btn-primaer w-full">Passwort speichern</button>
      </form>
      <p className="mt-4 text-sm"><Link className="text-marke underline" href="/">← zur App</Link></p>
    </Anmeldeseite>
  );
}
