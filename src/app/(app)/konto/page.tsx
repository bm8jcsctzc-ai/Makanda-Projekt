"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Meldung } from "@/components/Anmeldeseite";
import { Seitenkopf } from "@/components/Seitenkopf";
import { api, fehlertext } from "@/lib/api";
import { anmeldeFehler, MIN_PASSWORT_LAENGE } from "@/lib/anmeldung";
import { ROLLEN_NAMEN } from "@/lib/rechte";
import { useSitzung } from "@/lib/sitzung";
import { supabase } from "@/lib/supabase";

/** Eigenen Namen und eigenes Passwort ändern, abmelden – auch Ziel des Links „Passwort vergessen“ */
export default function KontoSeite() {
  const { profil, neuLaden, abmelden } = useSitzung();
  const router = useRouter();
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

  async function passwortAendern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formular = e.currentTarget;
    const form = new FormData(formular);
    const passwort = String(form.get("passwort"));
    setFehler(undefined);
    setErfolg(undefined);
    if (passwort.length < MIN_PASSWORT_LAENGE) return setFehler(`Das Passwort muss mindestens ${MIN_PASSWORT_LAENGE} Zeichen haben.`);
    if (passwort !== form.get("passwort2")) return setFehler("Die Passwörter stimmen nicht überein.");
    const { error } = await supabase.auth.updateUser({ password: passwort });
    if (error) return setFehler(anmeldeFehler(error.message));
    setErfolg("Dein neues Passwort ist gespeichert.");
    formular.reset();
  }

  if (!profil) return null;

  return (
    <>
      <Seitenkopf titel="Mein Konto" untertitel={`${profil.email} · ${ROLLEN_NAMEN[profil.rolle]}`} />
      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={nameAendern} className="karte space-y-3">
          <h2 className="font-semibold">Mein Name</h2>
          <Meldung fehler={nameMeldung.fehler} erfolg={nameMeldung.erfolg} />
          <div>
            <label className="feld-label" htmlFor="name">Name</label>
            <input className="eingabe" id="name" name="name" defaultValue={profil.name} autoComplete="name" required />
          </div>
          <p className="text-xs text-slate-500">Eine neue Anmelde-E-Mail trägt der Inhaber unter Einstellungen › Benutzer ein.</p>
          <button className="btn">Name speichern</button>
        </form>

        <form onSubmit={passwortAendern} className="karte space-y-3">
          <h2 className="font-semibold">Passwort ändern</h2>
          <Meldung fehler={fehler} erfolg={erfolg} />
          <div>
            <label className="feld-label" htmlFor="passwort">Neues Passwort (mind. 10 Zeichen)</label>
            <input className="eingabe" id="passwort" name="passwort" type="password" autoComplete="new-password" minLength={10} required />
          </div>
          <div>
            <label className="feld-label" htmlFor="passwort2">Wiederholen</label>
            <input className="eingabe" id="passwort2" name="passwort2" type="password" autoComplete="new-password" minLength={10} required />
          </div>
          <button className="btn-primaer">Passwort speichern</button>
        </form>
      </div>

      <div className="karte mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Auf geteilten Geräten nach der Arbeit abmelden.</p>
        <button className="btn-gefahr" onClick={() => abmelden().then(() => router.replace("/login/"))}>
          Abmelden
        </button>
      </div>
    </>
  );
}
