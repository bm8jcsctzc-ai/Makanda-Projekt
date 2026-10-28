import { Seitenkopf } from "@/components/Seitenkopf";
import { benoetigeBenutzer } from "@/lib/auth";
import { ladeEinstellungen } from "@/lib/einstellungen";
import { DARF_PLANEN } from "@/lib/technik";
import { speichereEinstellungen } from "./actions";
import { EinstellungsFormular } from "./EinstellungsFormular";

export default async function WartungsEinstellungen() {
  await benoetigeBenutzer(DARF_PLANEN);
  return (
    <>
      <Seitenkopf titel="Wartung & E-Mails" />
      <EinstellungsFormular aktion={speichereEinstellungen} werte={await ladeEinstellungen()} />
    </>
  );
}
