import { Seitenkopf } from "@/components/Seitenkopf";
import { istUuid } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { einsatzAuswahl } from "@/lib/auswahl";
import { heute } from "@/lib/format";
import { DARF_PLANEN } from "@/lib/technik";
import { speichereEinsatz } from "../actions";
import { EinsatzFormular } from "../EinsatzFormular";

export default async function NeuerEinsatz({ searchParams }: { searchParams: Promise<{ kunde?: string; anlage?: string }> }) {
  await benoetigeBenutzer(DARF_PLANEN);
  const { kunde, anlage } = await searchParams;
  const auswahl = await einsatzAuswahl();
  return (
    <>
      <Seitenkopf titel="Einsatz planen" />
      {auswahl.kunden.length === 0 ? (
        <p className="karte text-slate-600">Lege zuerst unter „Kunden“ einen Kunden an.</p>
      ) : (
        <EinsatzFormular
          aktion={speichereEinsatz.bind(null, null)}
          vorauswahl={{ kundeId: istUuid(kunde) ? kunde : undefined, anlageId: istUuid(anlage) ? anlage : undefined }}
          {...auswahl}
          heute={heute()}
          zurueck={istUuid(kunde) ? `/kunden/${kunde}` : "/einsaetze"}
        />
      )}
    </>
  );
}
