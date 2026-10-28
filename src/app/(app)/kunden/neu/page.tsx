import { Seitenkopf } from "@/components/Seitenkopf";
import { benoetigeBenutzer } from "@/lib/auth";
import { DARF_PLANEN } from "@/lib/technik";
import { speichereKunde } from "../actions";
import { KundenFormular } from "../KundenFormular";

export default async function NeuerKunde() {
  await benoetigeBenutzer(DARF_PLANEN);
  return (
    <>
      <Seitenkopf titel="Kunde anlegen" />
      <KundenFormular aktion={speichereKunde.bind(null, null)} zurueck="/kunden" />
    </>
  );
}
