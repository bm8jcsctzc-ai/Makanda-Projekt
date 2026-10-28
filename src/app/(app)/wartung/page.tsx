import Link from "next/link";
import { Seitenkopf } from "@/components/Seitenkopf";
import { benoetigeBenutzer } from "@/lib/auth";
import { ladeEinstellungen } from "@/lib/einstellungen";
import { formatDatum, formatMonat, heute } from "@/lib/format";
import { istTestmodus } from "@/lib/mail";
import { anlagenName, DARF_PLANEN, plusMonate } from "@/lib/technik";
import { ladeWartungen, type WartungsZeile } from "@/lib/wartung-daten";
import { monatsLast, naechsteMonate, wartungsStatus } from "@/lib/wartungsplan";
import { AufgabenKnoepfe } from "./AufgabenKnoepfe";

const ZEITRAEUME = { "3": "Überfällige und nächste 3 Monate", "12": "Überfällige und nächste 12 Monate", alle: "Alle Anlagen" } as const;

function Kennzahl({ titel, wert, hinweis, warnung = false }: { titel: string; wert: number; hinweis?: string; warnung?: boolean }) {
  return (
    <div className={`karte ${warnung && wert > 0 ? "border-red-200 bg-red-50" : ""}`}>
      <p className="text-sm text-slate-600">{titel}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${warnung && wert > 0 ? "text-red-700" : ""}`}>{wert}</p>
      {hinweis && <p className="mt-1 text-xs text-slate-500">{hinweis}</p>}
    </div>
  );
}

export default async function Wartungsplan({ searchParams }: { searchParams: Promise<{ zeitraum?: string; q?: string }> }) {
  await benoetigeBenutzer(DARF_PLANEN);
  const { zeitraum: z = "3", q = "" } = await searchParams;
  const zeitraum = (z in ZEITRAEUME ? z : "3") as keyof typeof ZEITRAEUME;
  const stichtag = heute();
  const [e, alle] = await Promise.all([ladeEinstellungen(), ladeWartungen(stichtag)]);
  const vorlauf = e.erinnerungVorlaufMonate;

  const mitTermin = alle.filter((w) => w.a.naechsteWartungAm);
  const status = (w: WartungsZeile) => wartungsStatus(w.a.naechsteWartungAm, stichtag, vorlauf);
  const ueberfaellig = mitTermin.filter((w) => status(w) === "ueberfaellig");
  const baldOhneTermin = mitTermin.filter((w) => status(w) === "bald" && !w.geplantAm);
  const geplant = mitTermin.filter((w) => w.geplantAm);
  const ohneTermin = alle.filter((w) => !w.a.naechsteWartungAm);

  const monate = naechsteMonate(stichtag.slice(0, 7), 12);
  const last = monatsLast(mitTermin.map((w) => w.a.naechsteWartungAm!), monate, e.haeufungGrenze);
  const maxLast = Math.max(1, ...last.monate.map((m) => m.anzahl));
  const haeufungen = last.monate.filter((m) => m.auffaellig);

  // Liste filtern und nach Monat gruppieren
  const bis = zeitraum === "alle" ? null : plusMonate(stichtag, Number(zeitraum));
  const suche = q.trim().toLowerCase();
  const liste = mitTermin.filter(
    (w) =>
      (!bis || w.a.naechsteWartungAm! <= bis) &&
      (!suche || [w.k.name, w.k.ort, w.a.hersteller, w.a.modell].some((t) => t?.toLowerCase().includes(suche))),
  );
  const gruppen = new Map<string, WartungsZeile[]>();
  for (const w of liste) {
    const titel = status(w) === "ueberfaellig" ? "Überfällig" : formatMonat(w.a.naechsteWartungAm!.slice(0, 7));
    gruppen.set(titel, [...(gruppen.get(titel) ?? []), w]);
  }

  return (
    <>
      <Seitenkopf
        titel="Wartungsplan"
        untertitel={`Erinnerung an Kunden ${vorlauf} Monate vor Fälligkeit`}
        aktionen={<a className="btn-primaer" href="/wartung/export" download>⬇ Excel herunterladen</a>}
      />

      {istTestmodus() && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>Testmodus:</strong> E-Mails werden noch nicht verschickt, sondern nur im{" "}
          <Link className="underline" href="/einstellungen/emails">E-Mail-Protokoll</Link> gespeichert.
        </p>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kennzahl titel="Überfällig" wert={ueberfaellig.length} warnung />
        <Kennzahl titel={`Fällig in ${vorlauf} Monaten, ohne Termin`} wert={baldOhneTermin.length} />
        <Kennzahl titel="Termin geplant" wert={geplant.length} />
        <Kennzahl titel="Anlagen gesamt" wert={alle.length} hinweis={ohneTermin.length ? `${ohneTermin.length} ohne Wartungstermin` : undefined} />
      </div>

      {haeufungen.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">⚠ Monate mit vielen Wartungen – besser früh planen</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {haeufungen.map((m) => (
              <li key={m.monat}>
                <strong>{formatMonat(m.monat)}:</strong> {m.anzahl} Wartungen ({m.grund}).
                {m.ausweichen?.length ? ` Tipp: einige Termine in ${m.ausweichen.map(formatMonat).join(" oder ")} vorziehen.` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <section className="karte lg:col-span-2">
          <h2 className="mb-1 font-semibold">Wartungen pro Monat</h2>
          <p className="mb-3 text-xs text-slate-500">
            Durchschnitt {last.durchschnitt.toLocaleString("de-DE", { maximumFractionDigits: 1 })} pro Monat · überfällige zählen in den aktuellen Monat
          </p>
          <ul className="space-y-1.5">
            {last.monate.map((m) => (
              <li key={m.monat} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="whitespace-nowrap text-slate-700">{formatMonat(m.monat)}</span>
                <span className="h-4 rounded-r bg-slate-100">
                  {m.anzahl > 0 && (
                    <span
                      className="block h-4 rounded-r"
                      style={{ width: `${(m.anzahl / maxLast) * 100}%`, background: m.auffaellig ? "#d97706" : "#2a78d6" }}
                    />
                  )}
                </span>
                <span className={`text-right tabular-nums ${m.auffaellig ? "font-semibold text-amber-800" : "text-slate-700"}`}>
                  {m.auffaellig && "⚠ "}
                  {m.anzahl}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="karte space-y-3">
          <h2 className="font-semibold">Automatische E-Mails</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>täglich: Erinnerung an Kunden {vorlauf} Monate vor der Wartung, Übersicht an das Büro</li>
            <li>montags: Excel mit allen Wartungskunden an das Büro</li>
          </ul>
          {e.bueroEmail ? (
            <p className="text-sm text-slate-600">Büro-Adresse: {e.bueroEmail}</p>
          ) : (
            <p className="fehler-box">Noch keine Büro-E-Mail eingetragen.</p>
          )}
          <Link className="text-sm text-marke underline" href="/einstellungen/wartung">Einstellungen und Text der Erinnerung</Link>
          <AufgabenKnoepfe testmodus={istTestmodus()} />
        </section>
      </div>

      <form className="karte mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label className="feld-label" htmlFor="zeitraum">Zeitraum</label>
          <select className="eingabe" id="zeitraum" name="zeitraum" defaultValue={zeitraum}>
            {Object.entries(ZEITRAEUME).map(([wert, text]) => <option key={wert} value={wert}>{text}</option>)}
          </select>
        </div>
        <div>
          <label className="feld-label" htmlFor="q">Suche</label>
          <input className="eingabe" id="q" name="q" type="search" defaultValue={q} placeholder="Kunde, Ort, Hersteller" />
        </div>
        <button className="btn-primaer">Anzeigen</button>
      </form>

      {liste.length === 0 ? (
        <p className="karte text-slate-600">{alle.length === 0 ? "Noch keine Anlagen erfasst." : "Keine Wartungen in diesem Zeitraum."}</p>
      ) : (
        <div className="space-y-5">
          {[...gruppen.entries()].map(([titel, zeilen]) => (
            <section key={titel}>
              <h2 className={`mb-2 text-sm font-semibold ${titel === "Überfällig" ? "text-red-700" : "text-slate-600"}`}>
                {titel} · {zeilen.length}
              </h2>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {zeilen.map((w) => (
                  <li key={w.a.id} className="grid gap-2 p-3 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
                    <span className={`text-sm font-medium tabular-nums ${titel === "Überfällig" ? "text-red-700" : ""}`}>
                      {formatDatum(w.a.naechsteWartungAm)}
                    </span>
                    <span className="min-w-0">
                      <Link className="font-medium text-marke hover:underline" href={`/kunden/${w.k.id}`}>{w.k.name}</Link>
                      {w.k.ort && <span className="text-slate-500"> · {w.k.ort}</span>}
                      <Link className="block truncate text-sm text-slate-600 hover:underline" href={`/anlagen/${w.a.id}`}>{anlagenName(w.a)}</Link>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      {w.geplantAm ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Termin {formatDatum(w.geplantAm)}</span>
                      ) : (
                        <>
                          {w.erinnertAm && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
                              erinnert {formatDatum(w.erinnertAm.toISOString())}
                            </span>
                          )}
                          {!w.k.email && <span className="text-xs text-slate-500">keine E-Mail</span>}
                          <Link className="btn py-1" href={`/einsaetze/neu?kunde=${w.k.id}&anlage=${w.a.id}&datum=${w.a.naechsteWartungAm! < stichtag ? stichtag : w.a.naechsteWartungAm}`}>
                            Termin planen
                          </Link>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
