# App online stellen – Schritt für Schritt

Ziel: Die App läuft im Internet unter einer eigenen Adresse. Dafür braucht es zwei Dienste, bei beiden meldest du dich **mit deinem GitHub-Konto** an:

| Dienst | Aufgabe |
|---|---|
| **Supabase** | Datenbank und Speicher für Fotos und Rechnungen (Rechenzentrum Frankfurt) |
| **Vercel** | führt die App aus und gibt ihr eine Internetadresse (ebenfalls Frankfurt) |

Dauer: etwa 20 Minuten. Die Bezeichnungen der Knöpfe können sich bei den Anbietern leicht ändern.

> **Wichtig:** Passwörter und Schlüssel aus dieser Anleitung nur bei Vercel eintragen – nicht in Chats oder E-Mails kopieren.

---

## Teil 1: Supabase (Datenbank und Speicher)

1. Öffne **supabase.com** → **Start your project** → **Continue with GitHub**.
2. Lege eine Organisation an (Name z. B. der Firmenname, Plan **Free**).
3. **New project**:
   - Name: `makanda`
   - **Database Password**: auf **Generate a password** klicken und das Passwort **sicher notieren** (z. B. im Passwort-Manager). Du brauchst es gleich.
   - **Region: Central EU (Frankfurt)** – wichtig für den Datenschutz.
   - **Create new project**, dann 1–2 Minuten warten.
4. **Verbindungsadresse der Datenbank** holen:
   - Oben auf **Connect** klicken.
   - Bei **Connection String** den Typ **Transaction pooler** wählen (Port **6543**).
   - Die Adresse kopieren. Sie sieht so aus:
     `postgresql://postgres.abcd…:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
   - `[YOUR-PASSWORD]` (mit den eckigen Klammern) durch dein Datenbank-Passwort ersetzen.
     Enthält das Passwort Sonderzeichen wie `@`, `#` oder `/`, lieber in Supabase ein neues ohne Sonderzeichen erzeugen (Project Settings › Database › Reset database password).
   - Das ist der Wert für **DATABASE_URL**.
5. **Projekt-Adresse und geheimer Schlüssel** holen: **Project Settings** (Zahnrad) → **API** bzw. **API Keys**:
   - **Project URL** (`https://abcd….supabase.co`) → Wert für **SUPABASE_URL**
   - **Secret key** (beginnt mit `sb_secret_`; bei älteren Projekten heißt er **service_role**) → Wert für **SUPABASE_SECRET_KEY**

   Den Speicher-Ordner für Fotos und Rechnungen legt die App beim ersten Hochladen selbst an (nicht öffentlich).

---

## Teil 2: Vercel (die App im Internet)

1. Öffne **vercel.com/signup** → Plan **Hobby** → **Continue with GitHub**.
2. **Add New… → Project**. Bei **Import Git Repository** das Projekt **Makanda-Projekt** auswählen → **Import**.
   Erscheint es nicht: **Adjust GitHub App Permissions** und Vercel den Zugriff auf das Projekt erlauben.
3. Framework wird automatisch erkannt (**Next.js**). Nichts ändern.
4. **Environment Variables** aufklappen und diese vier eintragen (Name links, Wert rechts):

   | Name | Wert |
   |---|---|
   | `DATABASE_URL` | Verbindungsadresse aus Teil 1, Schritt 4 |
   | `SUPABASE_URL` | Project URL aus Teil 1, Schritt 5 |
   | `SUPABASE_SECRET_KEY` | Secret key aus Teil 1, Schritt 5 |
   | `CRON_SECRET` | eine lange Zufallszeichenkette, z. B. aus dem Passwort-Manager (mind. 32 Zeichen) |

5. **Deploy** klicken und 2–3 Minuten warten.
6. Auf **Continue to Dashboard** → oben steht die Adresse, z. B. `makanda-projekt.vercel.app`.

---

## Teil 3: Erster Start

1. Die Adresse öffnen. Es erscheint die **Ersteinrichtung**.
   **Sofort** den ersten Zugang anlegen – bis dahin könnte jeder, der die Adresse kennt, ihn anlegen.
2. Unter **Einstellungen › Betrieb & E-Mails** Firmenname, Telefon und Büro-E-Mail eintragen (Bundesland ist schon Baden-Württemberg).
3. Unter **Einstellungen › Benutzer** die Zugänge für deinen Freund (Rolle **Inhaber**) und die Monteure anlegen.
4. Auf dem Handy die Adresse öffnen und über das Browser-Menü **„Zum Home-Bildschirm“** hinzufügen – dann startet die App wie eine normale App.

## Gut zu wissen

- **Updates:** Jede Änderung, die auf `main` in GitHub landet, veröffentlicht Vercel automatisch.
- **E-Mails** laufen bis zur Einrichtung eines Mail-Dienstes im Testmodus (Einstellungen › E-Mail-Protokoll).
- **Kosten:** Supabase Free und Vercel Hobby kosten nichts. Für die geschäftliche Nutzung verlangt Vercel den Pro-Tarif. Supabase pausiert kostenlose Projekte nach längerer Inaktivität; im echten Betrieb ist der Pro-Tarif mit täglicher Datensicherung empfehlenswert.
- **Upload-Grenze:** Dateien bis 4 MB. Fotos werden in der App automatisch verkleinert.
