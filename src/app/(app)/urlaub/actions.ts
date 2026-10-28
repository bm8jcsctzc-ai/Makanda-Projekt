"use server";

import { and, eq, gte, lte, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { abwesenheit, abwesenheitsart, benutzer, urlaubskonto, type Abwesenheitsart } from "@/db/schema";
import { istDatum, istUuid, optionalerText, text, type FormularZustand } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { formatDatum } from "@/lib/format";
import { sendeMail } from "@/lib/mail";
import { arbeitstage, DARF_EINTRAGEN, DARF_GENEHMIGEN, formatTage } from "@/lib/urlaub";
import { bundesland } from "@/lib/urlaub-daten";

export async function abwesenheitEintragen(_: FormularZustand, form: FormData): Promise<FormularZustand> {
  const b = await benoetigeBenutzer();
  const fuerAlle = DARF_EINTRAGEN.includes(b.rolle);
  const benutzerId = fuerAlle ? text(form, "benutzerId") || b.id : b.id;
  const art = (fuerAlle ? text(form, "art") : "urlaub") as Abwesenheitsart;
  const von = text(form, "von");
  const bis = text(form, "bis") || von;
  const halbtags = form.get("halbtags") === "on";

  if (!istUuid(benutzerId)) return { fehler: "Bitte einen Mitarbeiter wählen." };
  if (!abwesenheitsart.enumValues.includes(art)) return { fehler: "Bitte die Art wählen." };
  if (!istDatum(von) || !istDatum(bis)) return { fehler: "Bitte gültige Daten angeben." };
  if (bis < von) return { fehler: "„Bis“ darf nicht vor „Von“ liegen." };
  if (halbtags && von !== bis) return { fehler: "Ein halber Tag geht nur bei einem einzelnen Tag." };

  const land = await bundesland();
  const tage = arbeitstage({ von, bis, halbtags }, land);
  if (art === "urlaub" && tage === 0) return { fehler: "In diesem Zeitraum liegt kein Arbeitstag (nur Wochenende oder Feiertage)." };

  const db = await getDb();
  const [mitarbeiter] = await db.select().from(benutzer).where(eq(benutzer.id, benutzerId));
  if (!mitarbeiter?.aktiv) return { fehler: "Mitarbeiter nicht gefunden." };
  const [doppelt] = await db
    .select({ von: abwesenheit.von, bis: abwesenheit.bis })
    .from(abwesenheit)
    .where(and(eq(abwesenheit.benutzerId, benutzerId), ne(abwesenheit.status, "abgelehnt"), lte(abwesenheit.von, bis), gte(abwesenheit.bis, von)));
  if (doppelt) {
    return { fehler: `Für diesen Zeitraum ist schon eine Abwesenheit eingetragen (${formatDatum(doppelt.von)} – ${formatDatum(doppelt.bis)}).` };
  }

  // Urlaub muss genehmigt werden – außer der Inhaber trägt ihn ein. Krankheit usw. gilt sofort.
  const status = art !== "urlaub" || DARF_GENEHMIGEN.includes(b.rolle) ? "genehmigt" : "beantragt";
  const [neu] = await db
    .insert(abwesenheit)
    .values({
      benutzerId,
      art,
      von,
      bis,
      halbtags,
      status,
      bemerkung: optionalerText(form, "bemerkung"),
      eingetragenVon: b.id,
      ...(status === "genehmigt" && art === "urlaub" ? { entschiedenVon: b.id, entschiedenAm: new Date() } : {}),
    })
    .returning({ id: abwesenheit.id });

  if (status === "beantragt") {
    const inhaber = await db
      .select({ email: benutzer.email })
      .from(benutzer)
      .where(and(eq(benutzer.rolle, "inhaber"), eq(benutzer.aktiv, true)));
    for (const i of inhaber) {
      await sendeMail({
        an: i.email,
        betreff: `Urlaubsantrag von ${mitarbeiter.name}`,
        text: `${mitarbeiter.name} beantragt Urlaub vom ${formatDatum(von)} bis ${formatDatum(bis)} (${formatTage(tage)}).\n\nBitte in der App unter „Urlaub“ genehmigen oder ablehnen.`,
      });
    }
  }
  revalidatePath("/", "layout");
  redirect(`/urlaub/${neu.id}`);
}

export async function entscheiden(id: string, genehmigen: boolean, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  const b = await benoetigeBenutzer(DARF_GENEHMIGEN);
  const db = await getDb();
  const [zeile] = await db
    .select({ a: abwesenheit, email: benutzer.email, name: benutzer.name })
    .from(abwesenheit)
    .innerJoin(benutzer, eq(abwesenheit.benutzerId, benutzer.id))
    .where(eq(abwesenheit.id, id));
  if (!zeile) return { fehler: "Antrag nicht gefunden." };
  if (zeile.a.status !== "beantragt") return { fehler: "Über diesen Antrag wurde schon entschieden." };
  const kommentar = optionalerText(form, "kommentar");
  if (!genehmigen && !kommentar) return { fehler: "Bitte kurz begründen, warum der Antrag abgelehnt wird." };

  await db
    .update(abwesenheit)
    .set({ status: genehmigen ? "genehmigt" : "abgelehnt", entscheidungKommentar: kommentar, entschiedenVon: b.id, entschiedenAm: new Date() })
    .where(eq(abwesenheit.id, id));
  await sendeMail({
    an: zeile.email,
    betreff: `Dein Urlaub vom ${formatDatum(zeile.a.von)} wurde ${genehmigen ? "genehmigt" : "abgelehnt"}`,
    text: `Hallo ${zeile.name},\n\ndein Urlaubsantrag vom ${formatDatum(zeile.a.von)} bis ${formatDatum(zeile.a.bis)} wurde ${
      genehmigen ? "genehmigt" : "abgelehnt"
    }.${kommentar ? `\n\nKommentar: ${kommentar}` : ""}\n\nViele Grüße\n${b.name}`,
  });
  revalidatePath("/", "layout");
  return { erfolg: genehmigen ? "Genehmigt." : "Abgelehnt." };
}

/** Mitarbeiter ziehen offene Anträge zurück; Inhaber und Büro können jeden Eintrag löschen. */
export async function abwesenheitLoeschen(id: string) {
  const b = await benoetigeBenutzer();
  const db = await getDb();
  const [a] = await db.select().from(abwesenheit).where(eq(abwesenheit.id, id));
  if (!a) redirect("/urlaub");
  const eigenerAntrag = a.benutzerId === b.id && a.status === "beantragt";
  if (eigenerAntrag || DARF_EINTRAGEN.includes(b.rolle)) await db.delete(abwesenheit).where(eq(abwesenheit.id, id));
  revalidatePath("/", "layout");
  redirect("/urlaub");
}

export async function kontoSpeichern(benutzerId: string, jahr: number, _: FormularZustand, form: FormData): Promise<FormularZustand> {
  await benoetigeBenutzer(DARF_GENEHMIGEN);
  const anspruch = Number(text(form, "anspruch"));
  const uebertrag = Number(text(form, "uebertrag").replace(",", ".") || 0);
  if (!Number.isInteger(anspruch) || anspruch < 0 || anspruch > 60) return { fehler: "Anspruch: ganze Zahl zwischen 0 und 60." };
  if (Number.isNaN(uebertrag) || uebertrag < 0 || uebertrag > 60 || (uebertrag * 2) % 1 !== 0) {
    return { fehler: "Übertrag: Zahl in halben Tagen, z. B. 2,5." };
  }
  const db = await getDb();
  await db
    .insert(urlaubskonto)
    .values({ benutzerId, jahr, anspruchTage: anspruch, uebertragHalbeTage: uebertrag * 2 })
    .onConflictDoUpdate({
      target: [urlaubskonto.benutzerId, urlaubskonto.jahr],
      set: { anspruchTage: anspruch, uebertragHalbeTage: uebertrag * 2 },
    });
  revalidatePath("/urlaub", "layout");
  return { erfolg: "Gespeichert." };
}

