import type { Benutzer } from "@/db/schema";
import { feiertag, istWochenende, type Bundesland } from "@/lib/feiertage";
import { ARTEN, DARF_EINTRAGEN, tage } from "@/lib/urlaub";
import type { AbwesenheitMitName } from "@/lib/urlaub-daten";

const WOCHENTAG = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

type Props = {
  monat: string;
  team: Benutzer[];
  abwesenheiten: AbwesenheitMitName[];
  land: Bundesland | null;
  betrachter: Benutzer;
  heute: string;
};

/** Monatsübersicht: eine Zeile pro Mitarbeiter, eine Spalte pro Tag */
export function TeamKalender({ monat, team, abwesenheiten, land, betrachter, heute }: Props) {
  const [j, m] = monat.split("-").map(Number);
  const letzter = new Date(Date.UTC(j, m, 0)).getUTCDate();
  const tageImMonat = tage(`${monat}-01`, `${monat}-${String(letzter).padStart(2, "0")}`);
  // Monteure sehen bei Kollegen nur „abwesend“ – der Grund (z. B. Krankheit) ist vertraulich
  const siehtGrund = (benutzerId: string) => DARF_EINTRAGEN.includes(betrachter.rolle) || benutzerId === betrachter.id;

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-28 border-b border-slate-200 bg-white px-2 py-1 text-left font-medium text-slate-500">Mitarbeiter</th>
              {tageImMonat.map((d) => {
                const frei = istWochenende(d) || !!feiertag(d, land);
                return (
                  <th
                    key={d}
                    title={feiertag(d, land) ?? undefined}
                    className={`min-w-7 border-b border-slate-200 px-0.5 py-1 text-center font-normal ${frei ? "bg-slate-100 text-slate-400" : "text-slate-600"} ${d === heute ? "bg-blue-100 font-semibold text-marke" : ""}`}
                  >
                    <div>{WOCHENTAG[new Date(`${d}T00:00:00Z`).getUTCDay()]}</div>
                    <div>{Number(d.slice(8))}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {team.map((b) => {
              const eigene = abwesenheiten.filter((a) => a.benutzerId === b.id);
              return (
                <tr key={b.id}>
                  <th className="sticky left-0 z-10 border-b border-slate-100 bg-white px-2 py-1.5 text-left font-medium whitespace-nowrap text-slate-700">{b.name}</th>
                  {tageImMonat.map((d) => {
                    const frei = istWochenende(d) || !!feiertag(d, land);
                    const a = eigene.find((x) => x.von <= d && x.bis >= d);
                    let stil: React.CSSProperties | undefined;
                    let titel: string | undefined;
                    if (a && !frei) {
                      const art = siehtGrund(b.id) ? ARTEN[a.art] : { name: "abwesend", farbe: "#64748b", hell: "#e2e8f0" };
                      const farbe = a.status === "genehmigt" ? art.farbe : art.hell;
                      stil = {
                        background: a.halbtags ? `linear-gradient(135deg, ${farbe} 50%, transparent 50%)` : farbe,
                        ...(a.status === "beantragt" ? { outline: `1.5px dashed ${art.farbe}`, outlineOffset: "-3px" } : {}),
                      };
                      titel = `${b.name}: ${art.name}${a.status === "beantragt" ? " (beantragt)" : ""}${a.halbtags ? ", halber Tag" : ""}`;
                    }
                    return (
                      <td
                        key={d}
                        title={titel ?? feiertag(d, land) ?? undefined}
                        className={`h-8 border-b border-l border-slate-100 ${frei ? "bg-slate-100" : ""}`}
                        style={stil}
                        data-tag={d}
                        data-person={b.name}
                        data-abwesend={a && !frei ? a.status : undefined}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {Object.values(ARTEN).map((a) => (
          <li key={a.name} className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm" style={{ background: a.farbe }} />
            {a.name}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm" style={{ background: "#cde2fb", outline: "1.5px dashed #2a78d6", outlineOffset: "-2px" }} />
          beantragt
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-slate-100 ring-1 ring-slate-200" />
          Wochenende / Feiertag
        </li>
      </ul>
    </div>
  );
}
