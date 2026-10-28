import { desc } from "drizzle-orm";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { mailProtokoll } from "@/db/schema";
import { benoetigeBenutzer } from "@/lib/auth";
import { formatDatumZeit } from "@/lib/format";
import { istTestmodus } from "@/lib/mail";
import { DARF_PLANEN } from "@/lib/technik";

const STATUS = {
  gesendet: { text: "gesendet", klasse: "bg-green-100 text-green-800" },
  testmodus: { text: "Testmodus", klasse: "bg-amber-100 text-amber-800" },
  fehler: { text: "Fehler", klasse: "bg-red-100 text-red-800" },
};

export default async function EmailProtokoll() {
  await benoetigeBenutzer(DARF_PLANEN);
  const db = await getDb();
  const mails = await db.select().from(mailProtokoll).orderBy(desc(mailProtokoll.erstelltAm)).limit(200);
  return (
    <>
      <Seitenkopf titel="E-Mail-Protokoll" untertitel="Die letzten 200 E-Mails, die die App verschickt hat." />
      {istTestmodus() && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>Testmodus:</strong> Es ist noch kein Mail-Dienst eingerichtet. E-Mails werden nur hier gespeichert und nicht verschickt.
        </p>
      )}
      {mails.length === 0 ? (
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
