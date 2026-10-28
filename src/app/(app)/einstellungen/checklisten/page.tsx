import { asc } from "drizzle-orm";
import Link from "next/link";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { checklisteVorlage } from "@/db/schema";
import { benoetigeBenutzer } from "@/lib/auth";
import { ANLAGENTYPEN, DARF_PLANEN } from "@/lib/technik";

export default async function ChecklistenVorlagen() {
  await benoetigeBenutzer(DARF_PLANEN);
  const db = await getDb();
  const vorlagen = await db.select().from(checklisteVorlage).orderBy(asc(checklisteVorlage.name));
  return (
    <>
      <Seitenkopf
        titel="Checklisten-Vorlagen"
        untertitel="Änderungen gelten für neue Checklisten. Bereits ausgefüllte bleiben unverändert."
        aktionen={<Link className="btn-primaer" href="/einstellungen/checklisten/neu">+ Neue Vorlage</Link>}
      />
      <div className="karte overflow-x-auto p-0 sm:p-0">
        <table className="tabelle">
          <thead>
            <tr>
              <th>Name</th>
              <th className="hidden sm:table-cell">Passt zu</th>
              <th>Punkte</th>
              <th className="hidden sm:table-cell">Version</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vorlagen.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td>
                  <Link className="font-medium text-marke hover:underline" href={`/einstellungen/checklisten/${v.id}`}>{v.name}</Link>
                  {v.istWartung && <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-800">Wartung</span>}
                </td>
                <td className="hidden sm:table-cell">{v.anlagentyp ? ANLAGENTYPEN[v.anlagentyp] : "alle Anlagen"}</td>
                <td>{v.punkte.length}</td>
                <td className="hidden sm:table-cell">{v.version}</td>
                <td>{v.aktiv ? "aktiv" : <span className="text-slate-400">inaktiv</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
