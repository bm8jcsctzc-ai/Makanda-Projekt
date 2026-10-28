import type { TeamMitglied } from "@/lib/typen";
import { api } from "@/lib/api";
import { ladeFinanzen } from "@/lib/finanz-daten";

/** Gehälter plus Namen aus Team und bisherigen Einträgen für die Vorschlagsliste */
export async function ladeGehaelter() {
  const [finanzen, team] = await Promise.all([ladeFinanzen(), api<TeamMitglied[]>("team")]);
  const personal = finanzen.personal ?? [];
  const namen = [...new Set([...team.map((t) => t.name), ...personal.map((p) => p.mitarbeiter)])].sort((x, y) => x.localeCompare(y, "de"));
  return { personal, namen };
}
