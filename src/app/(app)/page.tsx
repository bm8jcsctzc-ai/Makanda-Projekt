import { and, gt, lt, ne } from "drizzle-orm";
import Link from "next/link";
import { EinsatzListe } from "@/components/EinsatzListe";
import { einsatz } from "@/db/schema";
import { benoetigeBenutzer } from "@/lib/auth";
import { ladeEinsaetze, nachDatum, tagesTitel } from "@/lib/einsaetze";
import { ladeEinstellungen } from "@/lib/einstellungen";
import { formatMonat, heute } from "@/lib/format";
import { ladeWartungen } from "@/lib/wartung-daten";
import { monatsLast, naechsteMonate, wartungsStatus } from "@/lib/wartungsplan";
import { DARF_PLANEN, plusTage } from "@/lib/technik";

async function wartungsHinweis(stichtag: string) {
  const [e, zeilen] = await Promise.all([ladeEinstellungen(), ladeWartungen(stichtag)]);
  const status = zeilen.map((z) => wartungsStatus(z.a.naechsteWartungAm, stichtag, e.erinnerungVorlaufMonate));
  const last = monatsLast(
    zeilen.map((z) => z.a.naechsteWartungAm).filter((d): d is string => !!d),
    naechsteMonate(stichtag.slice(0, 7), 12),
    e.haeufungGrenze,
  );
  return {
    ueberfaellig: status.filter((s) => s === "ueberfaellig").length,
    baldOhneTermin: zeilen.filter((z, i) => status[i] === "bald" && !z.geplantAm).length,
    haeufungen: last.monate.filter((m) => m.auffaellig).map((m) => m.monat),
  };
}

export default async function Heute() {
  const b = await benoetigeBenutzer();
  const planer = DARF_PLANEN.includes(b.rolle);
  const stichtag = heute();
  const inEinerWoche = plusTage(stichtag, 8);

  const [meineHeute, meineBald, meineLiegengeblieben, alleHeute] = await Promise.all([
    ladeEinsaetze({ von: stichtag, bis: stichtag, monteurId: b.id }),
    ladeEinsaetze({ monteurId: b.id, extra: and(gt(einsatz.datum, stichtag), lt(einsatz.datum, inEinerWoche)) }),
    // Vergangene Einsätze, die noch nicht abgeschlossen sind
    ladeEinsaetze({ monteurId: b.id, extra: and(lt(einsatz.datum, stichtag), ne(einsatz.status, "abgeschlossen")) }),
    planer ? ladeEinsaetze({ von: stichtag, bis: stichtag }) : Promise.resolve([]),
  ]);
  const hatEigene = meineHeute.length + meineBald.length + meineLiegengeblieben.length > 0;
  const wartung = planer ? await wartungsHinweis(stichtag) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hallo {b.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-slate-600">{tagesTitel(stichtag, stichtag)}</p>
      </div>

      {meineLiegengeblieben.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-red-700">Noch nicht abgeschlossen</h2>
          <EinsatzListe zeilen={meineLiegengeblieben} mitMonteur={false} />
        </section>
      )}

      {(hatEigene || !planer) && (
        <section>
          <h2 className="mb-2 font-semibold">Meine Einsätze heute</h2>
          {meineHeute.length ? (
            <EinsatzListe zeilen={meineHeute} mitMonteur={false} />
          ) : (
            <p className="karte text-sm text-slate-600">Heute sind dir keine Einsätze zugeteilt.</p>
          )}
        </section>
      )}

      {meineBald.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Meine nächsten Tage</h2>
          {nachDatum(meineBald).map(([datum, liste]) => (
            <div key={datum}>
              <h3 className="mb-2 text-sm font-medium text-slate-600">{tagesTitel(datum, stichtag)}</h3>
              <EinsatzListe zeilen={liste} mitMonteur={false} />
            </div>
          ))}
        </section>
      )}

      {wartung && (wartung.ueberfaellig > 0 || wartung.baldOhneTermin > 0 || wartung.haeufungen.length > 0) && (
        <Link href="/wartung" className="block rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 hover:bg-amber-100">
          <p className="font-semibold">Wartungsplan</p>
          <p className="mt-1">
            {[
              wartung.ueberfaellig > 0 && `${wartung.ueberfaellig} überfällig`,
              wartung.baldOhneTermin > 0 && `${wartung.baldOhneTermin} bald fällig ohne Termin`,
              wartung.haeufungen.length > 0 && `viele Wartungen im ${wartung.haeufungen.map(formatMonat).join(", ")}`,
            ]
              .filter(Boolean)
              .join(" · ")}{" "}
            →
          </p>
        </Link>
      )}

      {planer && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Alle Einsätze heute</h2>
            <Link className="btn" href="/einsaetze/neu">+ Einsatz planen</Link>
          </div>
          {alleHeute.length ? (
            <EinsatzListe zeilen={alleHeute} />
          ) : (
            <p className="karte text-sm text-slate-600">
              Für heute ist nichts geplant. <Link className="text-marke underline" href="/einsaetze">Alle Einsätze ansehen</Link>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
