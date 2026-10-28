import { Seitenkopf } from "@/components/Seitenkopf";
import { benoetigeBenutzer, DARF_GEHAELTER } from "@/lib/auth";
import { heute } from "@/lib/format";
import { mitarbeiterNamen } from "../daten";
import { speicherePersonalkosten } from "../actions";
import { GehaltsFormular } from "../GehaltsFormular";

export default async function NeuesGehalt() {
  await benoetigeBenutzer(DARF_GEHAELTER);
  return (
    <>
      <Seitenkopf titel="Gehalt eintragen" />
      <GehaltsFormular
        aktion={speicherePersonalkosten.bind(null, null)}
        mitarbeiterVorschlaege={await mitarbeiterNamen()}
        heute={heute()}
      />
    </>
  );
}
