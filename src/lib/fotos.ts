import { desc, eq, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { benutzer, foto } from "@/db/schema";
import type { GalerieFoto } from "@/components/FotoGalerie";

export async function ladeFotos(bedingung: SQL): Promise<GalerieFoto[]> {
  const db = await getDb();
  const zeilen = await db
    .select({ f: foto, von: benutzer.name })
    .from(foto)
    .leftJoin(benutzer, eq(foto.aufgenommenVon, benutzer.id))
    .where(bedingung)
    .orderBy(desc(foto.aufgenommenAm));
  return zeilen.map(({ f, von }) => ({ ...f, von }));
}
