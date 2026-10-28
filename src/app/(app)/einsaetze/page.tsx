import { asc, eq, isNull, ne } from "drizzle-orm";
import Link from "next/link";
import { EinsatzListe } from "@/components/EinsatzListe";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { benutzer, einsatz } from "@/db/schema";
import { istDatum, istUuid } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { ladeEinsaetze, nachDatum, tagesTitel } from "@/lib/einsaetze";
import { heute } from "@/lib/format";
import { DARF_PLANEN, plusMonate } from "@/lib/technik";

type Filter = { von?: string; bis?: string; monteur?: string; offen?: string };

export default async function Einsaetze({ searchParams }: { searchParams: Promise<Filter> }) {
  await benoetigeBenutzer(DARF_PLANEN);
  const f = await searchParams;
  const stichtag = heute();
  const von = f.von && istDatum(f.von) ? f.von : stichtag;
  const bis = f.bis && istDatum(f.bis) ? f.bis : plusMonate(stichtag, 1);
  const monteurId = istUuid(f.monteur) ? f.monteur : undefined;
  const nurOffene = f.offen === "1";

  const db = await getDb();
  const [zeilen, mitarbeiter, ohneMonteur] = await Promise.all([
    ladeEinsaetze({ von, bis, monteurId, extra: nurOffene ? ne(einsatz.status, "abgeschlossen") : undefined }),
    db.select({ id: benutzer.id, name: benutzer.name }).from(benutzer).where(eq(benutzer.aktiv, true)).orderBy(asc(benutzer.name)),
    ladeEinsaetze({ von: stichtag, extra: isNull(einsatz.monteurId) }),
  ]);

  return (
    <>
      <Seitenkopf
        titel="Einsätze"
        aktionen={<Link className="btn-primaer" href="/einsaetze/neu">+ Einsatz planen</Link>}
      />

      {ohneMonteur.length > 0 && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ⚠ {ohneMonteur.length} {ohneMonteur.length === 1 ? "kommender Einsatz hat" : "kommende Einsätze haben"} noch keinen Monteur.
        </p>
      )}

      <form className="karte mb-4 grid gap-3 sm:grid-cols-5 sm:items-end">
        <div>
          <label className="feld-label" htmlFor="von">Von</label>
          <input className="eingabe" id="von" name="von" type="date" defaultValue={von} />
        </div>
        <div>
          <label className="feld-label" htmlFor="bis">Bis</label>
          <input className="eingabe" id="bis" name="bis" type="date" defaultValue={bis} />
        </div>
        <div>
          <label className="feld-label" htmlFor="monteur">Monteur</label>
          <select className="eingabe" id="monteur" name="monteur" defaultValue={monteurId ?? ""}>
            <option value="">alle</option>
            {mitarbeiter.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm sm:pb-2">
          <input type="checkbox" name="offen" value="1" defaultChecked={nurOffene} className="size-4" /> nur offene
        </label>
        <button className="btn-primaer">Anzeigen</button>
      </form>

      {zeilen.length === 0 ? (
        <p className="karte text-slate-600">Keine Einsätze in diesem Zeitraum.</p>
      ) : (
        <div className="space-y-5">
          {nachDatum(zeilen).map(([datum, liste]) => (
            <section key={datum}>
              <h2 className="mb-2 text-sm font-semibold text-slate-600">{tagesTitel(datum, stichtag)}</h2>
              <EinsatzListe zeilen={liste} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
