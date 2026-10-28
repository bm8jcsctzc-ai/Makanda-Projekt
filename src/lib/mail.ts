import { getDb } from "@/db";
import { mailProtokoll } from "@/db/schema";

// Echter Versand über Resend (https://resend.com), sobald RESEND_API_KEY und MAIL_ABSENDER gesetzt sind,
// z. B. MAIL_ABSENDER="Firma Mustermann <service@firma.de>". Ohne diese Einstellungen läuft der Testmodus:
// Die Mail wird nur im Protokoll gespeichert (Einstellungen › E-Mails) und nicht verschickt.

export type Anhang = { name: string; inhalt: Buffer };
export type Mail = { an: string; betreff: string; text: string; anhang?: Anhang; antwortAn?: string | null };

export function istTestmodus() {
  return !process.env.RESEND_API_KEY || !process.env.MAIL_ABSENDER;
}

export async function sendeMail(mail: Mail): Promise<"gesendet" | "testmodus" | "fehler"> {
  let status: "gesendet" | "testmodus" | "fehler" = "testmodus";
  let fehler: string | null = null;

  if (!istTestmodus()) {
    try {
      const antwort = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.MAIL_ABSENDER,
          to: [mail.an],
          subject: mail.betreff,
          text: mail.text,
          ...(mail.antwortAn ? { reply_to: mail.antwortAn } : {}),
          ...(mail.anhang ? { attachments: [{ filename: mail.anhang.name, content: mail.anhang.inhalt.toString("base64") }] } : {}),
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (antwort.ok) {
        status = "gesendet";
      } else {
        status = "fehler";
        fehler = `${antwort.status}: ${(await antwort.text()).slice(0, 500)}`;
      }
    } catch (e) {
      status = "fehler";
      fehler = e instanceof Error ? e.message : String(e);
    }
  }

  const db = await getDb();
  await db.insert(mailProtokoll).values({
    an: mail.an,
    betreff: mail.betreff,
    text: mail.text,
    anhang: mail.anhang?.name ?? null,
    status,
    fehler,
  });
  return status;
}
