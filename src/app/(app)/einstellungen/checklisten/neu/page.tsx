import { Seitenkopf } from "@/components/Seitenkopf";
import { benoetigeBenutzer } from "@/lib/auth";
import { DARF_PLANEN } from "@/lib/technik";
import { speichereVorlage } from "../actions";
import { VorlagenEditor } from "../VorlagenEditor";

export default async function NeueVorlage() {
  await benoetigeBenutzer(DARF_PLANEN);
  return (
    <>
      <Seitenkopf titel="Neue Checklisten-Vorlage" />
      <VorlagenEditor
        start={{ name: "", anlagentyp: null, istWartung: false, aktiv: true, punkte: [{ id: "p1", text: "", typ: "pruefung", pflicht: true }] }}
        speichern={speichereVorlage.bind(null, null)}
      />
    </>
  );
}
