import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Seitenkopf } from "@/components/Seitenkopf";
import { Angaben, HinweisBox, StatusMarke } from "@/components/Status";
import { getDb } from "@/db";
import { anlage, benutzer, einsatz, kunde } from "@/db/schema";
import { istUuid } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { formatDatum, heute } from "@/lib/format";
import { adresse, anlagenName, DARF_PLANEN, EINSATZARTEN, navigationsLink } from "@/lib/technik";

export default async function KundeDetail({ params }: { params: Promise<{ id: string }> }) {
  const b = await benoetigeBenutzer();
  const planer = DARF_PLANEN.includes(b.rolle);
  const { id } = await params;
  if (!istUuid(id)) notFound();
  const db = await getDb();
  const [k] = await db.select().from(kunde).where(eq(kunde.id, id));
  if (!k) notFound();
  const [anlagen, einsaetze] = await Promise.all([
    db.select().from(anlage).where(eq(anlage.kundeId, id)).orderBy(asc(anlage.erstelltAm)),
    db
      .select({ e: einsatz, monteur: benutzer.name })
      .from(einsatz)
      .leftJoin(benutzer, eq(einsatz.monteurId, benutzer.id))
      .where(eq(einsatz.kundeId, id))
      .orderBy(desc(einsatz.datum))
      .limit(30),
  ]);
  const nav = navigationsLink(k);
  const stichtag = heute();

  return (
    <>
      <Seitenkopf
        titel={k.name}
        untertitel={k.taifunKundennr ? `TAIFUN-Kundennr. ${k.taifunKundennr}` : undefined}
        aktionen={
          planer && (
            <>
              <Link className="btn" href={`/kunden/${id}/bearbeiten`}>Bearbeiten</Link>
              <Link className="btn-primaer" href={`/einsaetze/neu?kunde=${id}`}>+ Einsatz planen</Link>
            </>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="karte space-y-3">
          <h2 className="font-semibold">Kontakt</h2>
          <Angaben
            werte={[
              ["Ansprechpartner", k.ansprechpartner],
              ["Adresse", adresse(k) && (nav ? <a className="text-marke underline" href={nav} target="_blank">{adresse(k)}</a> : adresse(k))],
              ["Telefon", k.telefon && <a className="text-marke underline" href={`tel:${k.telefon.replace(/[^\d+]/g, "")}`}>{k.telefon}</a>],
              ["E-Mail", k.email && <a className="text-marke underline" href={`mailto:${k.email}`}>{k.email}</a>],
            ]}
          />
          <HinweisBox text={k.hinweise} />
        </section>

        <section className="karte lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Anlagen</h2>
            <Link className="btn" href={`/anlagen/neu?kunde=${id}`}>+ Anlage</Link>
          </div>
          {anlagen.length === 0 ? (
            <p className="text-sm text-slate-600">Noch keine Anlage erfasst.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {anlagen.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                  <div>
                    <Link className="font-medium text-marke hover:underline" href={`/anlagen/${a.id}`}>{anlagenName(a)}</Link>
                    <div className="text-xs text-slate-500">
                      {[a.aufstellort, a.baujahr && `Baujahr ${a.baujahr}`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className={`text-sm ${a.naechsteWartungAm && a.naechsteWartungAm < stichtag ? "font-medium text-red-700" : "text-slate-600"}`}>
                    {a.naechsteWartungAm ? `Wartung fällig ${formatDatum(a.naechsteWartungAm)}` : "kein Wartungstermin"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="karte lg:col-span-3">
          <h2 className="mb-3 font-semibold">Einsätze</h2>
          {einsaetze.length === 0 ? (
            <p className="text-sm text-slate-600">Noch keine Einsätze.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {einsaetze.map(({ e, monteur }) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <Link className="text-marke hover:underline" href={`/einsaetze/${e.id}`}>
                    {formatDatum(e.datum)} · {EINSATZARTEN[e.art]}
                    {e.beschreibung && <span className="text-slate-600"> – {e.beschreibung}</span>}
                  </Link>
                  <span className="flex items-center gap-2 text-slate-500">
                    {monteur}
                    <StatusMarke status={e.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
