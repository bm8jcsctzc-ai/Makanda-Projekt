import { redirect } from "next/navigation";
import { Anmeldeseite } from "@/components/Anmeldeseite";
import { aktuellerBenutzer } from "@/lib/auth";
import { gibtEsBenutzer } from "@/lib/benutzer";
import { LoginFormular } from "./LoginFormular";

export const dynamic = "force-dynamic";

export default async function LoginSeite() {
  if (!(await gibtEsBenutzer())) redirect("/einrichtung");
  if (await aktuellerBenutzer()) redirect("/");
  return (
    <Anmeldeseite titel="Anmelden">
      <LoginFormular />
    </Anmeldeseite>
  );
}
