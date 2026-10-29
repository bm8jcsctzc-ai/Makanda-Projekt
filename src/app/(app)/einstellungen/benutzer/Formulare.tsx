"use client";

import type { Benutzer } from "@/db/schema";
import type { FormularZustand } from "@/lib/aktionen";
import { useFormular } from "@/lib/useFormular";

type Aktion = (zustand: FormularZustand, form: FormData) => Promise<FormularZustand>;

export const ROLLEN = [
  { wert: "inhaber", name: "Inhaber – alles, auch Gehälter und Benutzer" },
  { wert: "buero", name: "Büro – Rechnungen, Fixkosten, Übersicht" },
  { wert: "monteur", name: "Monteur – nur eigene Einsätze" },
];

function Meldung({ zustand }: { zustand: FormularZustand }) {
  if (zustand?.fehler) return <p className="fehler-box">{zustand.fehler}</p>;
  if (zustand?.erfolg) return <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{zustand.erfolg}</p>;
  return null;
}

export function Einladen({ aktion, nachher }: { aktion: Aktion; nachher: () => void }) {
  const { zustand, laeuft, formularProps } = useFormular(
    async (z, f) => {
      const r = await aktion(z, f);
      nachher();
      return r;
    },
    { leerenBeiErfolg: true },
  );
  return (
    <form {...formularProps} className="karte grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="font-semibold">Neue Person einladen</h2>
        <p className="mt-1 text-sm text-slate-600">
          Die App erzeugt einen Einladungscode. Gib ihn der Person persönlich. Sie registriert sich damit selbst und wählt ihr eigenes Passwort.
        </p>
      </div>
      <div className="sm:col-span-2"><Meldung zustand={zustand} /></div>
      <div>
        <label className="feld-label" htmlFor="neu-name">Name</label>
        <input className="eingabe" id="neu-name" name="name" required />
      </div>
      <div>
        <label className="feld-label" htmlFor="neu-email">E-Mail</label>
        <input className="eingabe" id="neu-email" name="email" type="email" required />
      </div>
      <div>
        <label className="feld-label" htmlFor="neu-rolle">Rolle</label>
        <select className="eingabe" id="neu-rolle" name="rolle" defaultValue="monteur">
          {ROLLEN.map((r) => <option key={r.wert} value={r.wert}>{r.name}</option>)}
        </select>
      </div>
      <div className="flex items-end">
        <button className="btn-primaer" disabled={laeuft}>Einladen</button>
      </div>
    </form>
  );
}

export function BenutzerZeile({
  benutzer: b,
  aktion,
  datenAendern,
  passwortSetzen,
  binIchSelbst,
}: {
  benutzer: Benutzer;
  aktion: Aktion;
  datenAendern: Aktion;
  passwortSetzen: Aktion;
  binIchSelbst: boolean;
}) {
  const { zustand, laeuft, formularProps } = useFormular(aktion);
  const daten = useFormular(datenAendern);
  const passwort = useFormular(passwortSetzen, { leerenBeiErfolg: true });
  return (
    <div className="border-b border-slate-100 py-4 last:border-0">
      <form {...formularProps} className="grid gap-3 md:grid-cols-[1fr_14rem_auto_auto] md:items-center">
        <div>
          <p className="font-medium">{b.name}{binIchSelbst && <span className="text-slate-400"> (du)</span>}</p>
          <p className="text-sm text-slate-500">{b.email}</p>
        </div>
        <select className="eingabe" name="rolle" defaultValue={b.rolle} aria-label="Rolle">
          {ROLLEN.map((r) => <option key={r.wert} value={r.wert}>{r.name.split(" – ")[0]}</option>)}
        </select>
        <div className="flex flex-col gap-1 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="aktiv" defaultChecked={b.aktiv} className="size-4" /> aktiv
          </label>
          <label className="flex items-center gap-2 whitespace-nowrap">
            <input type="checkbox" name="imTeam" defaultChecked={b.imTeam} className="size-4" /> im Urlaubsplaner
          </label>
        </div>
        <button className="btn" disabled={laeuft}>Speichern</button>
        {zustand && <div className="md:col-span-4"><Meldung zustand={zustand} /></div>}
      </form>

      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-marke">Name, E-Mail oder Passwort ändern</summary>
        <div className="mt-3 grid gap-4 rounded-lg bg-slate-50 p-3 md:grid-cols-2">
          <form {...daten.formularProps} className="space-y-2">
            <div>
              <label className="feld-label" htmlFor={`name-${b.id}`}>Name</label>
              <input className="eingabe" id={`name-${b.id}`} name="name" defaultValue={b.name} required />
            </div>
            <div>
              <label className="feld-label" htmlFor={`email-${b.id}`}>E-Mail (zum Anmelden)</label>
              <input className="eingabe" id={`email-${b.id}`} name="email" type="email" defaultValue={b.email} required />
            </div>
            <Meldung zustand={daten.zustand} />
            <button className="btn" disabled={daten.laeuft}>Name und E-Mail speichern</button>
          </form>
          <form {...passwort.formularProps} className="space-y-2">
            <div>
              <label className="feld-label" htmlFor={`passwort-${b.id}`}>Neues Passwort (mind. 10 Zeichen)</label>
              <input className="eingabe" id={`passwort-${b.id}`} name="passwort" minLength={10} autoComplete="new-password" required />
            </div>
            <p className="text-xs text-slate-500">
              {binIchSelbst ? "Dein eigenes Passwort änderst du auch unter „Mein Konto“." : "Zum Beispiel, wenn jemand sein Passwort vergessen hat. Gib es persönlich weiter."}
            </p>
            <Meldung zustand={passwort.zustand} />
            <button className="btn" disabled={passwort.laeuft}>Passwort setzen</button>
          </form>
        </div>
      </details>
    </div>
  );
}
