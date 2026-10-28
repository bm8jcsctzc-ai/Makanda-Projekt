import { redirect } from "next/navigation";
import { Anmeldeseite } from "@/components/Anmeldeseite";
import { gibtEsBenutzer } from "@/lib/benutzer";
import { EinrichtungsFormular } from "./EinrichtungsFormular";

export const dynamic = "force-dynamic";

export default async function EinrichtungSeite() {
  if (await gibtEsBenutzer()) redirect("/login");
  return (
    <Anmeldeseite titel="Ersteinrichtung">
      <p className="mb-4 text-sm text-slate-600">
        Lege den ersten Zugang an. Er bekommt die Rolle <strong>Inhaber</strong> und darf alles, auch weitere
        Benutzer anlegen.
      </p>
      <EinrichtungsFormular />
    </Anmeldeseite>
  );
}
