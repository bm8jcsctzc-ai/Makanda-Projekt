"use client";

import Link from "next/link";
import { EinsatzListe } from "@/components/EinsatzListe";
import { Laden } from "@/components/Laden";
import type { Einstellungen } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage } from "@/lib/daten";
import { formatMonat, heute } from "@/lib/format";
import { useSitzung } from "@/lib/sitzung";
import { DARF_PLANEN, plusTage } from "@/lib/technik";
import type { AbwesenheitImKalender, EinsatzZeile, WartungsZeile } from "@/lib/typen";
import { ARTEN } from "@/lib/urlaub";
import { monatsLast, naechsteMonate, wartungsStatus } from "@/lib/wartungsplan";
import { tagesTitel, nachDatum } from "@/lib/einsaetze";

async function wartungsHinweis(stichtag: string) {
  const [e, zeilen] = await Promise.all([api<Einstellungen>("einstellungen"), api<WartungsZeile[]>("wartungen")]);
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

export default function Heute() {
  const { profil: b } = useSitzung();
  const planer = !!b && DARF_PLANEN.includes(b.rolle);
  const stichtag = heute();
  const { daten, fehler } = useAbfrage(
    async () => {
      const einsaetze = (args: Record<string, unknown>) => api<EinsatzZeile[]>("einsaetze", args);
      const [meineHeute, meineBald, meineLiegengeblieben, alleHeute, wartung, abwesendHeute] = await Promise.all([
        einsaetze({ p_von: stichtag, p_bis: stichtag, p_monteur: b!.id }),
        einsaetze({ p_von: plusTage(stichtag, 1), p_bis: plusTage(stichtag, 7), p_monteur: b!.id }),
        // Vergangene Einsätze, die noch nicht abgeschlossen sind
        einsaetze({ p_bis: plusTage(stichtag, -1), p_monteur: b!.id, p_nur_offen: true }),
        planer ? einsaetze({ p_von: stichtag, p_bis: stichtag }) : Promise.resolve([]),
        planer ? wartungsHinweis(stichtag) : Promise.resolve(null),
        planer ? api<AbwesenheitImKalender[]>("abwesenheiten", { p_von: stichtag, p_bis: stichtag }) : Promise.resolve([]),
      ]);
      return { meineHeute, meineBald, meineLiegengeblieben, alleHeute, wartung, abwesendHeute };
    },
    [b?.id],
    !!b,
  );
  if (!b || !daten) return <Laden fehler={fehler} />;
  const { meineHeute, meineBald, meineLiegengeblieben, alleHeute, wartung, abwesendHeute } = daten;
  const hatEigene = meineHeute.length + meineBald.length + meineLiegengeblieben.length > 0;

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

      {abwesendHeute.length > 0 && (
        <p className="rounded-xl border border-slate-200 bg-flaeche p-3 text-sm">
          <span className="font-medium">Heute abwesend:</span>{" "}
          {abwesendHeute.map((a) => `${a.name} (${a.art ? ARTEN[a.art].name : "abwesend"}${a.status === "beantragt" ? ", beantragt" : ""})`).join(", ")}
        </p>
      )}

      {wartung && (wartung.ueberfaellig > 0 || wartung.baldOhneTermin > 0 || wartung.haeufungen.length > 0) && (
        <Link href="/wartung/" className="block rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 hover:bg-amber-100">
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
            <Link className="btn" href="/einsaetze/neu/">+ Einsatz planen</Link>
          </div>
          {alleHeute.length ? (
            <EinsatzListe zeilen={alleHeute} />
          ) : (
            <p className="karte text-sm text-slate-600">
              Für heute ist nichts geplant. <Link className="text-marke underline" href="/einsaetze/">Alle Einsätze ansehen</Link>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
