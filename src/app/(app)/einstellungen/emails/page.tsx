"use client";

import { Laden } from "@/components/Laden";
import { Seitenkopf } from "@/components/Seitenkopf";
import type { MailProtokoll } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage } from "@/lib/daten";
import { formatDatumZeit } from "@/lib/format";

const STATUS = {
  wartend: { text: "wartet auf Versand", klasse: "bg-slate-100 text-slate-700" },
  gesendet: { text: "gesendet", klasse: "bg-green-100 text-green-800" },
  testmodus: { text: "Testmodus", klasse: "bg-amber-100 text-amber-800" },
  fehler: { text: "Fehler", klasse: "bg-red-100 text-red-800" },
};

export default function EmailProtokoll() {
  const { daten: mails, fehler } = useAbfrage(() => api<MailProtokoll[]>("mail_protokoll"), []);
  return (
    <>
      <Seitenkopf
        titel="E-Mail-Protokoll"
        untertitel="Die letzten 200 E-Mails der App. Verschickt wird jeden Morgen und jede Stunde automatisch über GitHub."
      />
      {mails?.[0]?.status === "testmodus" && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>Testmodus:</strong> Es ist noch kein Mail-Dienst eingerichtet. E-Mails werden nur hier gespeichert und nicht verschickt.
        </p>
      )}
      {!mails ? (
        <Laden fehler={fehler} />
      ) : mails.length === 0 ? (
        <p className="karte text-slate-600">Noch keine E-Mails.</p>
      ) : (
        <ul className="space-y-2">
          {mails.map((m) => (
            <li key={m.id}>
              <details className="karte group">
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[m.status].klasse}`}>{STATUS[m.status].text}</span>
                  <span className="font-medium">{m.betreff}</span>
                  <span className="text-sm text-slate-500">an {m.an} · {formatDatumZeit(m.erstelltAm)}</span>
                  {m.anhang && <span className="text-sm text-slate-500">📎 {m.anhang}</span>}
                </summary>
                {m.fehler && <p className="fehler-box mt-3">{m.fehler}</p>}
                <pre className="mt-3 font-sans text-sm whitespace-pre-wrap text-slate-700">{m.text}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
