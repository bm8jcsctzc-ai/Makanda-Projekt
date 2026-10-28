import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { urlaubskonto } from "@/db/schema";
import { benoetigeBenutzer } from "@/lib/auth";
import { heute } from "@/lib/format";
import { DARF_GENEHMIGEN, formatTage } from "@/lib/urlaub";
import { bundesland, ladeKonto, ladeTeam } from "@/lib/urlaub-daten";
import { kontoSpeichern } from "../actions";
import { KontoFormular } from "../Formulare";

export default async function Urlaubskonten({ searchParams }: { searchParams: Promise<{ jahr?: string }> }) {
  await benoetigeBenutzer(DARF_GENEHMIGEN);
  const { jahr: j } = await searchParams;
  const aktuell = Number(heute().slice(0, 4));
  const jahr = j && /^\d{4}$/.test(j) ? Number(j) : aktuell;
  const [land, team] = await Promise.all([bundesland(), ladeTeam()]);
  const db = await getDb();
  const zeilen = await Promise.all(
    team.map(async (b) => {
      const [eintrag] = await db.select().from(urlaubskonto).where(and(eq(urlaubskonto.benutzerId, b.id), eq(urlaubskonto.jahr, jahr)));
      return { b, eintrag, konto: await ladeKonto(b, jahr, land) };
    }),
  );

  return (
    <>
      <Seitenkopf
        titel={`Urlaubskonten ${jahr}`}
        untertitel="Anspruch + Übertrag aus dem Vorjahr. Halbe Tage sind möglich (z. B. 2,5)."
        aktionen={
          <>
            <Link className="btn" href={`/urlaub/konten?jahr=${jahr - 1}`}>‹ {jahr - 1}</Link>
            <Link className="btn" href={`/urlaub/konten?jahr=${jahr + 1}`}>{jahr + 1} ›</Link>
          </>
        }
      />
      <div className="karte overflow-x-auto p-0 sm:p-0">
        <table className="tabelle">
          <thead>
            <tr>
              <th>Mitarbeiter</th>
              <th>Anspruch + Übertrag</th>
              <th className="betrag">Genehmigt</th>
              <th className="betrag">Beantragt</th>
              <th className="betrag">Rest</th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map(({ b, eintrag, konto }) => (
              <tr key={b.id}>
                <td className="font-medium">{b.name}</td>
                <td>
                  <KontoFormular
                    aktion={kontoSpeichern.bind(null, b.id, jahr)}
                    anspruch={eintrag?.anspruchTage ?? b.urlaubstageProJahr}
                    uebertrag={(eintrag?.uebertragHalbeTage ?? 0) / 2}
                  />
                </td>
                <td className="betrag">{formatTage(konto.genehmigt)}</td>
                <td className="betrag">{formatTage(konto.beantragt)}</td>
                <td className={`betrag font-semibold ${konto.rest < 0 ? "text-red-700" : ""}`}>{formatTage(konto.rest)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
