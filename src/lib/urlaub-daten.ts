import type { Einstellungen } from "@/db/schema";
import { api } from "./api";
import { BUNDESLAENDER, type Bundesland } from "./feiertage";

export async function bundesland(): Promise<Bundesland | null> {
  const e = await api<Einstellungen>("einstellungen");
  return e.bundesland && e.bundesland in BUNDESLAENDER ? (e.bundesland as Bundesland) : null;
}
