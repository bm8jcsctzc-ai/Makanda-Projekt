import { Seitenkopf } from "@/components/Seitenkopf";
import { bekannteLieferanten } from "@/lib/abfragen";
import { benoetigeBenutzer, DARF_FINANZEN } from "@/lib/auth";
import { heute } from "@/lib/format";
import { speichereRechnung } from "../actions";
import { RechnungsFormular } from "../RechnungsFormular";

export default async function NeueRechnung() {
  await benoetigeBenutzer(DARF_FINANZEN);
  return (
    <>
      <Seitenkopf titel="Rechnung erfassen" untertitel="Felder mit * sind Pflicht." />
      <RechnungsFormular
        aktion={speichereRechnung.bind(null, null)}
        lieferanten={await bekannteLieferanten()}
        heute={heute()}
      />
    </>
  );
}
