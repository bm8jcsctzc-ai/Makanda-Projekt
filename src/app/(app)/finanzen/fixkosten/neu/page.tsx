import { Seitenkopf } from "@/components/Seitenkopf";
import { benoetigeBenutzer, DARF_FINANZEN } from "@/lib/auth";
import { heute } from "@/lib/format";
import { speichereFixkosten } from "../actions";
import { FixkostenFormular } from "../FixkostenFormular";

export default async function NeueFixkosten() {
  await benoetigeBenutzer(DARF_FINANZEN);
  return (
    <>
      <Seitenkopf titel="Fixkosten eintragen" untertitel="Regelmäßige Kosten wie Miete, Leasing, Versicherungen, Software." />
      <FixkostenFormular aktion={speichereFixkosten.bind(null, null)} heute={heute()} />
    </>
  );
}
