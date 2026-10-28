import { and, asc, eq, gte, lte, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { abwesenheit, benutzer, einsatz, kunde, urlaubskonto, type Abwesenheit, type Benutzer } from "@/db/schema";
import { ladeEinstellungen } from "./einstellungen";
import { BUNDESLAENDER, type Bundesland } from "./feiertage";
import { konto, type Konto } from "./urlaub";

export async function bundesland(): Promise<Bundesland | null> {
  const e = await ladeEinstellungen();
  return e.bundesland && e.bundesland in BUNDESLAENDER ? (e.bundesland as Bundesland) : null;
}

/** Aktive Mitarbeiter, die im Urlaubsplaner erscheinen */
export async function ladeTeam(): Promise<Benutzer[]> {
  const db = await getDb();
  return db
    .select()
    .from(benutzer)
    .where(and(eq(benutzer.aktiv, true), eq(benutzer.imTeam, true)))
    .orderBy(asc(benutzer.name));
}

export type AbwesenheitMitName = Abwesenheit & { name: string };

/** Abwesenheiten (ohne abgelehnte), die den Zeitraum berühren */
export async function ladeAbwesenheiten(von: string, bis: string, benutzerId?: string): Promise<AbwesenheitMitName[]> {
  const db = await getDb();
  const zeilen = await db
    .select({ a: abwesenheit, name: benutzer.name })
    .from(abwesenheit)
    .innerJoin(benutzer, eq(abwesenheit.benutzerId, benutzer.id))
    .where(
      and(
        lte(abwesenheit.von, bis),
        gte(abwesenheit.bis, von),
        ne(abwesenheit.status, "abgelehnt"),
        benutzerId ? eq(abwesenheit.benutzerId, benutzerId) : undefined,
      ),
    )
    .orderBy(asc(abwesenheit.von));
  return zeilen.map(({ a, name }) => ({ ...a, name }));
}

/** Urlaubskonto eines Mitarbeiters für ein Jahr */
export async function ladeKonto(b: Pick<Benutzer, "id" | "urlaubstageProJahr">, jahr: number, land: Bundesland | null): Promise<Konto> {
  const db = await getDb();
  const [eintrag] = await db
    .select()
    .from(urlaubskonto)
    .where(and(eq(urlaubskonto.benutzerId, b.id), eq(urlaubskonto.jahr, jahr)));
  const abw = await ladeAbwesenheiten(`${jahr}-01-01`, `${jahr}-12-31`, b.id);
  return konto(abw, jahr, eintrag?.anspruchTage ?? b.urlaubstageProJahr, eintrag?.uebertragHalbeTage ?? 0, land);
}

/** Was kollidiert mit einer Abwesenheit? Andere Abwesenheiten im Team und offene Einsätze der Person. */
export async function ladeKonflikte(a: Pick<Abwesenheit, "id" | "benutzerId" | "von" | "bis">) {
  const db = await getDb();
  const [andere, einsaetze] = await Promise.all([
    ladeAbwesenheiten(a.von, a.bis),
    db
      .select({ id: einsatz.id, datum: einsatz.datum, art: einsatz.art, kunde: kunde.name })
      .from(einsatz)
      .innerJoin(kunde, eq(einsatz.kundeId, kunde.id))
      .where(
        and(
          eq(einsatz.monteurId, a.benutzerId),
          gte(einsatz.datum, a.von),
          lte(einsatz.datum, a.bis),
          ne(einsatz.status, "abgeschlossen"),
        ),
      )
      .orderBy(asc(einsatz.datum)),
  ]);
  return { andere: andere.filter((x) => x.id !== a.id && x.benutzerId !== a.benutzerId), einsaetze };
}
