import { and, asc, eq, gte, inArray, isNotNull, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { anlage, einsatz, kunde, wartungErinnerung, type Anlage, type Kunde } from "@/db/schema";

export type WartungsZeile = {
  a: Anlage;
  k: Kunde;
  /** Datum des nächsten geplanten Wartungs-Einsatzes, falls vorhanden */
  geplantAm: string | null;
  /** Wann zuletzt für den aktuellen Fälligkeitstermin erinnert wurde */
  erinnertAm: Date | null;
  /** Alle Fälligkeitstermine, für die schon erinnert wurde */
  erinnertFuer: string[];
};

/** Alle Anlagen mit Kunde, geplantem Wartungstermin und Erinnerungen – sortiert nach Fälligkeit */
export async function ladeWartungen(heute: string): Promise<WartungsZeile[]> {
  const db = await getDb();
  const zeilen = await db
    .select({ a: anlage, k: kunde })
    .from(anlage)
    .innerJoin(kunde, eq(anlage.kundeId, kunde.id))
    .orderBy(asc(anlage.naechsteWartungAm), asc(kunde.name));
  if (zeilen.length === 0) return [];
  const ids = zeilen.map((z) => z.a.id);

  const [geplant, erinnerungen] = await Promise.all([
    db
      .select({ anlageId: einsatz.anlageId, datum: einsatz.datum })
      .from(einsatz)
      .where(
        and(
          inArray(einsatz.anlageId, ids),
          isNotNull(einsatz.anlageId),
          eq(einsatz.art, "wartung"),
          ne(einsatz.status, "abgeschlossen"),
          gte(einsatz.datum, heute),
        ),
      )
      .orderBy(asc(einsatz.datum)),
    db.select().from(wartungErinnerung).where(inArray(wartungErinnerung.anlageId, ids)),
  ]);

  const geplantNach = new Map<string, string>();
  for (const g of geplant) if (g.anlageId && !geplantNach.has(g.anlageId)) geplantNach.set(g.anlageId, g.datum);

  return zeilen.map(({ a, k }) => {
    const eigene = erinnerungen.filter((e) => e.anlageId === a.id);
    return {
      a,
      k,
      geplantAm: geplantNach.get(a.id) ?? null,
      erinnertAm: eigene.find((e) => e.faelligAm === a.naechsteWartungAm)?.gesendetAm ?? null,
      erinnertFuer: eigene.map((e) => e.faelligAm),
    };
  });
}
