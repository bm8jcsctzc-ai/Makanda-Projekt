import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { Seitenkopf } from "@/components/Seitenkopf";
import { TeamKalender } from "@/components/TeamKalender";
import { getDb } from "@/db";
import { abwesenheit, benutzer } from "@/db/schema";
import { benoetigeBenutzer } from "@/lib/auth";
import { formatDatum, formatMonat, heute } from "@/lib/format";
import { plusMonate, plusTage } from "@/lib/technik";
import { ARTEN, arbeitstage, DARF_EINTRAGEN, DARF_GENEHMIGEN, formatTage, STATUS } from "@/lib/urlaub";
import { bundesland, ladeAbwesenheiten, ladeKonto, ladeTeam } from "@/lib/urlaub-daten";

export default async function Urlaub({ searchParams }: { searchParams: Promise<{ monat?: string }> }) {
  const b = await benoetigeBenutzer();
  const verwaltet = DARF_EINTRAGEN.includes(b.rolle);
  const stichtag = heute();
  const { monat: m } = await searchParams;
  const monat = m && /^\d{4}-\d{2}$/.test(m) ? m : stichtag.slice(0, 7);
  const jahr = Number(stichtag.slice(0, 4));
  const vorher = plusMonate(`${monat}-01`, -1).slice(0, 7);
  const nachher = plusMonate(`${monat}-01`, 1).slice(0, 7);

  const db = await getDb();
  const [land, team, imMonat, meine, offen] = await Promise.all([
    bundesland(),
    ladeTeam(),
    ladeAbwesenheiten(`${monat}-01`, plusTage(plusMonate(`${monat}-01`, 1), -1)),
    db.select().from(abwesenheit).where(eq(abwesenheit.benutzerId, b.id)).orderBy(asc(abwesenheit.von)),
    DARF_GENEHMIGEN.includes(b.rolle)
      ? db
          .select({ a: abwesenheit, name: benutzer.name })
          .from(abwesenheit)
          .innerJoin(benutzer, eq(abwesenheit.benutzerId, benutzer.id))
          .where(eq(abwesenheit.status, "beantragt"))
          .orderBy(asc(abwesenheit.von))
      : Promise.resolve([]),
  ]);
  const meinKonto = b.imTeam ? await ladeKonto(b, jahr, land) : null;
  const meineAktuellen = meine.filter((a) => a.bis >= `${jahr}-01-01`);

  return (
    <>
      <Seitenkopf
        titel="Urlaub & Abwesenheiten"
        aktionen={
          <>
            {DARF_GENEHMIGEN.includes(b.rolle) && <Link className="btn" href="/urlaub/konten">Urlaubskonten</Link>}
            <Link className="btn-primaer" href="/urlaub/neu">{verwaltet ? "+ Abwesenheit eintragen" : "+ Urlaub beantragen"}</Link>
          </>
        }
      />

      {verwaltet && !land && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Noch kein Bundesland eingestellt – es werden nur bundesweite Feiertage berücksichtigt.{" "}
          <Link className="underline" href="/einstellungen/wartung">Jetzt einstellen</Link>
        </p>
      )}

      {offen.length > 0 && (
        <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="mb-2 font-semibold text-amber-900">Offene Anträge · {offen.length}</h2>
          <ul className="space-y-2">
            {offen.map(({ a, name }) => (
              <li key={a.id}>
                <Link href={`/urlaub/${a.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 hover:bg-amber-100/50">
                  <span>
                    <strong>{name}</strong> · {formatDatum(a.von)} – {formatDatum(a.bis)}
                  </span>
                  <span className="text-sm text-slate-600">{formatTage(arbeitstage(a, land))} · prüfen →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Link className="btn px-3" href={`/urlaub?monat=${vorher}`} aria-label="Vormonat">‹</Link>
          <h2 className="font-semibold">{formatMonat(monat)}</h2>
          <Link className="btn px-3" href={`/urlaub?monat=${nachher}`} aria-label="Nächster Monat">›</Link>
        </div>
        {team.length === 0 ? (
          <p className="karte text-sm text-slate-600">Noch keine Mitarbeiter im Team. (Benutzer › „im Urlaubsplaner“)</p>
        ) : (
          <TeamKalender monat={monat} team={team} abwesenheiten={imMonat} land={land} betrachter={b} heute={stichtag} />
        )}
      </section>

      {meinKonto && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="karte">
            <h2 className="mb-3 font-semibold">Mein Urlaub {jahr}</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
              <dt className="text-slate-600">Anspruch</dt>
              <dd className="text-right tabular-nums">{formatTage(meinKonto.anspruch)}</dd>
              {meinKonto.uebertrag > 0 && (
                <>
                  <dt className="text-slate-600">Übertrag Vorjahr</dt>
                  <dd className="text-right tabular-nums">+ {formatTage(meinKonto.uebertrag)}</dd>
                </>
              )}
              <dt className="text-slate-600">Genehmigt</dt>
              <dd className="text-right tabular-nums">− {formatTage(meinKonto.genehmigt)}</dd>
              <dt className="text-slate-600">Beantragt</dt>
              <dd className="text-right tabular-nums">− {formatTage(meinKonto.beantragt)}</dd>
              <dt className="border-t border-slate-200 pt-1 font-semibold">Rest</dt>
              <dd className="border-t border-slate-200 pt-1 text-right font-semibold tabular-nums" data-testid="resturlaub">
                {formatTage(meinKonto.rest)}
              </dd>
            </dl>
          </section>
          <section className="karte lg:col-span-2">
            <h2 className="mb-3 font-semibold">Meine Abwesenheiten</h2>
            {meineAktuellen.length === 0 ? (
              <p className="text-sm text-slate-600">Noch nichts eingetragen.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {meineAktuellen.map((a) => (
                  <li key={a.id}>
                    <Link href={`/urlaub/${a.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm hover:underline">
                      <span>
                        {ARTEN[a.art].name}: {formatDatum(a.von)}
                        {a.bis !== a.von && ` – ${formatDatum(a.bis)}`} · {formatTage(arbeitstage(a, land))}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[a.status].klasse}`}>{STATUS[a.status].text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
