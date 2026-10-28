import { redirect } from "next/navigation";
import { benoetigeBenutzer, DARF_FINANZEN } from "@/lib/auth";

export default async function Startseite() {
  const b = await benoetigeBenutzer();
  if (DARF_FINANZEN.includes(b.rolle)) redirect("/finanzen");
  return (
    <div className="karte">
      <h1 className="text-xl font-semibold">Hallo {b.name}</h1>
      <p className="mt-2 text-slate-600">
        Hier erscheinen bald deine Einsätze, Checklisten und Fotos. Dieser Bereich wird als Nächstes gebaut.
      </p>
    </div>
  );
}
