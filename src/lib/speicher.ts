import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Ablage für hochgeladene Dateien (Rechnungen, Fotos).
// Mit SUPABASE_URL und SUPABASE_SECRET_KEY: privater Bucket in Supabase Storage.
// Ohne: Ordner ./data/uploads – nur für den Betrieb auf einem eigenen Rechner geeignet.

export type Speicher = {
  schreiben(pfad: string, inhalt: Buffer, typ: string): Promise<void>;
  lesen(pfad: string): Promise<Buffer>;
  loeschen(pfad: string): Promise<void>;
};

export function ordnerSpeicher(basis = path.join(process.cwd(), "data", "uploads")): Speicher {
  return {
    async schreiben(pfad, inhalt) {
      await mkdir(path.join(basis, path.dirname(pfad)), { recursive: true });
      await writeFile(path.join(basis, pfad), inhalt);
    },
    lesen: (pfad) => readFile(path.join(basis, pfad)),
    async loeschen(pfad) {
      await unlink(path.join(basis, pfad)).catch(() => {});
    },
  };
}

export const BUCKET = "dateien";

/** Supabase Storage über die REST-Schnittstelle; der Bucket ist privat und wird bei Bedarf angelegt. */
export function supabaseSpeicher(url: string, schluessel: string, bucket = BUCKET): Speicher {
  const basis = `${url.replace(/\/$/, "")}/storage/v1`;
  const kopf = { apikey: schluessel, Authorization: `Bearer ${schluessel}` };
  const pfadUrl = (pfad: string) => pfad.split("/").map(encodeURIComponent).join("/");

  async function fehler(antwort: Response, was: string): Promise<never> {
    throw new Error(`Supabase Storage (${was}): ${antwort.status} ${(await antwort.text()).slice(0, 300)}`);
  }

  async function bucketAnlegen() {
    const antwort = await fetch(`${basis}/bucket`, {
      method: "POST",
      headers: { ...kopf, "Content-Type": "application/json" },
      body: JSON.stringify({ id: bucket, name: bucket, public: false }),
    });
    // 409 bzw. "already exists": hat inzwischen jemand anderes angelegt
    if (!antwort.ok && antwort.status !== 409 && !(await antwort.clone().text()).includes("already exists")) {
      await fehler(antwort, "Bucket anlegen");
    }
  }

  async function hochladen(pfad: string, inhalt: Buffer, typ: string) {
    return fetch(`${basis}/object/${bucket}/${pfadUrl(pfad)}`, {
      method: "POST",
      headers: { ...kopf, "Content-Type": typ, "x-upsert": "false" },
      body: new Uint8Array(inhalt),
    });
  }

  return {
    async schreiben(pfad, inhalt, typ) {
      let antwort = await hochladen(pfad, inhalt, typ);
      if (!antwort.ok && (await antwort.clone().text()).includes("Bucket not found")) {
        await bucketAnlegen();
        antwort = await hochladen(pfad, inhalt, typ);
      }
      if (!antwort.ok) await fehler(antwort, "Hochladen");
    },
    async lesen(pfad) {
      const antwort = await fetch(`${basis}/object/authenticated/${bucket}/${pfadUrl(pfad)}`, { headers: kopf });
      if (!antwort.ok) await fehler(antwort, "Lesen");
      return Buffer.from(await antwort.arrayBuffer());
    },
    async loeschen(pfad) {
      const antwort = await fetch(`${basis}/object/${bucket}`, {
        method: "DELETE",
        headers: { ...kopf, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [pfad] }),
      });
      if (!antwort.ok) await fehler(antwort, "Löschen");
    },
  };
}

let speicher: Speicher | undefined;

export function aktuellerSpeicher(): Speicher {
  const url = process.env.SUPABASE_URL;
  const schluessel = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  speicher ??= url && schluessel ? supabaseSpeicher(url, schluessel) : ordnerSpeicher();
  return speicher;
}
