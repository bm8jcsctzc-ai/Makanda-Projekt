import { createServer, type IncomingMessage, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabaseSpeicher } from "./speicher";

// Nachgebauter Supabase-Storage-Server: prüft Schlüssel, Bucket und Pfade wie das Original
const SCHLUESSEL = "sb_secret_test";
const dateien = new Map<string, { inhalt: Buffer; typ: string }>();
const buckets = new Set<string>();
const anfragen: string[] = [];
let server: Server;
let url = "";

function lesen(req: IncomingMessage): Promise<Buffer> {
  return new Promise((ok) => {
    const teile: Buffer[] = [];
    req.on("data", (t) => teile.push(t));
    req.on("end", () => ok(Buffer.concat(teile)));
  });
}

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const body = await lesen(req);
    anfragen.push(`${req.method} ${req.url}`);
    const antwort = (status: number, daten: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(daten));
    };
    if (req.headers.apikey !== SCHLUESSEL || req.headers.authorization !== `Bearer ${SCHLUESSEL}`) {
      return antwort(401, { message: "Invalid key" });
    }
    const pfad = decodeURIComponent(req.url!.replace(/^\/storage\/v1/, ""));
    if (req.method === "POST" && pfad === "/bucket") {
      const { id, public: oeffentlich } = JSON.parse(body.toString());
      if (oeffentlich !== false) return antwort(400, { message: "Bucket muss privat sein" });
      buckets.add(id);
      return antwort(200, { name: id });
    }
    let m = pfad.match(/^\/object\/([^/]+)\/(.+)$/);
    if (req.method === "POST" && m && !pfad.startsWith("/object/authenticated/")) {
      if (!buckets.has(m[1])) return antwort(400, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
      dateien.set(`${m[1]}/${m[2]}`, { inhalt: body, typ: req.headers["content-type"]! });
      return antwort(200, { Key: `${m[1]}/${m[2]}` });
    }
    m = pfad.match(/^\/object\/authenticated\/([^/]+)\/(.+)$/);
    if (req.method === "GET" && m) {
      const d = dateien.get(`${m[1]}/${m[2]}`);
      if (!d) return antwort(400, { error: "not_found", message: "Object not found" });
      res.writeHead(200, { "Content-Type": d.typ });
      return res.end(d.inhalt);
    }
    m = pfad.match(/^\/object\/([^/]+)$/);
    if (req.method === "DELETE" && m) {
      for (const p of JSON.parse(body.toString()).prefixes) dateien.delete(`${m[1]}/${p}`);
      return antwort(200, []);
    }
    antwort(404, { message: "unbekannt" });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const adresse = server.address();
  url = `http://127.0.0.1:${typeof adresse === "object" && adresse ? adresse.port : 0}/`;
});

afterAll(() => new Promise<void>((ok) => server.close(() => ok())));

describe("Supabase-Speicher", () => {
  it("legt den privaten Bucket beim ersten Hochladen an und speichert die Datei", async () => {
    const s = supabaseSpeicher(url, SCHLUESSEL);
    await s.schreiben("technik/2026/10/foto 1.jpg", Buffer.from("JPEG-Inhalt"), "image/jpeg");
    expect(buckets.has("dateien")).toBe(true);
    expect(anfragen.filter((a) => a.startsWith("POST /storage/v1/object/"))).toHaveLength(2);
    expect(dateien.get("dateien/technik/2026/10/foto 1.jpg")?.typ).toBe("image/jpeg");
  });

  it("liest und löscht Dateien", async () => {
    const s = supabaseSpeicher(url, SCHLUESSEL);
    await s.schreiben("finanzen/2026/10/r.pdf", Buffer.from("%PDF"), "application/pdf");
    expect((await s.lesen("finanzen/2026/10/r.pdf")).toString()).toBe("%PDF");
    await s.loeschen("finanzen/2026/10/r.pdf");
    expect(dateien.has("dateien/finanzen/2026/10/r.pdf")).toBe(false);
  });

  it("meldet Fehler verständlich", async () => {
    await expect(supabaseSpeicher(url, "falsch").lesen("x.jpg")).rejects.toThrow(/Supabase Storage \(Lesen\): 401/);
    await expect(supabaseSpeicher(url, SCHLUESSEL).lesen("gibt-es-nicht.jpg")).rejects.toThrow(/Object not found/);
  });
});
