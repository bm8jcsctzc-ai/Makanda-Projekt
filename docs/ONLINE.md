# App online stellen – Schritt für Schritt

Am Ende ist die App unter dieser Adresse erreichbar:
**https://bm8jcsctzc-ai.github.io/Makanda-Projekt/**

Dafür braucht es zwei kostenlose Dienste:

| Dienst | Aufgabe |
|---|---|
| **Supabase** | Datenbank, Anmeldung und Speicher für Fotos und Rechnungen (Rechenzentrum Frankfurt) |
| **GitHub** | zeigt die App im Internet an (GitHub Pages) und erledigt die Automatik: Erinnerungsmails, Wochenbericht, Datenbank-Updates (GitHub Actions) |

Dauer: etwa 20 Minuten. Die Bezeichnungen der Knöpfe können sich bei den Anbietern leicht ändern.

> **Wichtig:** Das Datenbank-Passwort und der Mail-Schlüssel kommen **nur** in die Einstellungen bei GitHub (als „Secret“). Nicht in Chats, E-Mails oder in den Code kopieren.
> Die **Project URL** und der **Publishable key** sind dagegen öffentlich. Sie stehen später sowieso in der App, jeder Browser bekommt sie.

---

## Teil 1: Supabase

Das Projekt `makanda` (Region Frankfurt) hast du schon angelegt. Jetzt brauchst du daraus drei Werte und zwei Einstellungen.

### 1.1 Projekt-Adresse und öffentlicher Schlüssel

**Project Settings** (Zahnrad unten links) → **API Keys** bzw. **Data API**:

- **Project URL**, sieht so aus: `https://abcdefgh.supabase.co`
- **Publishable key**, beginnt mit `sb_publishable_…`. Bei älteren Projekten heißt er **anon public**.

Den **Secret key** (`sb_secret_…`, früher **service_role**) brauchst du **nicht**. Gib ihn nie weiter.

### 1.2 Verbindungsadresse der Datenbank (geheim)

1. Oben auf **Connect** klicken.
2. Bei **Connection String** den Typ **Session pooler** wählen (Port **5432**).
   Den **Direct connection**-Typ nicht nehmen: Er funktioniert von GitHub aus nicht.
3. Die Adresse kopieren. Sie sieht so aus:
   `postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`
4. `[YOUR-PASSWORD]` (mit den eckigen Klammern) durch dein Datenbank-Passwort ersetzen.
   Enthält das Passwort Sonderzeichen wie `@`, `#`, `/` oder `?`: in Supabase ein neues Passwort ohne Sonderzeichen erzeugen (**Project Settings › Database › Reset database password**).

Das ist der Wert für **DATABASE_URL**.

### 1.3 Anmeldung einstellen

**Authentication** (Personen-Symbol links):

1. **Sign In / Providers** → **Email**:
   - **Allow new users to sign up**: **an** lassen. Registrieren kann sich trotzdem nur, wer einen Einladungscode vom Inhaber hat.
   - **Confirm email**: **aus**schalten → **Save**. Dann können sich neue Mitarbeiter sofort anmelden.
     Lässt du es an, muss jeder zuerst einen Link in einer E-Mail von Supabase anklicken. Die kostenlosen Supabase-Mails sind auf wenige pro Stunde begrenzt.
2. **URL Configuration**:
   - **Site URL**: `https://bm8jcsctzc-ai.github.io/Makanda-Projekt/`
   - Unter **Redirect URLs** → **Add URL**: `https://bm8jcsctzc-ai.github.io/Makanda-Projekt/**`
   - Speichern. Das braucht „Passwort vergessen?“, damit der Link aus der E-Mail zur App führt.

Die Tabellen, Schutzregeln und den Speicher für Dateien legt GitHub beim Veröffentlichen automatisch an (Teil 2).

---

## Teil 2: GitHub

Alles unter **github.com/bm8jcsctzc-ai/Makanda-Projekt**.

### 2.1 Projekt öffentlich machen

GitHub Pages ist für öffentliche Projekte kostenlos.

**Settings** → ganz unten **Danger Zone** → **Change repository visibility** → **Public**.

Öffentlich ist dabei nur der **Programmcode**. Die Daten (Kunden, Rechnungen, Fotos) liegen geschützt bei Supabase, und nur angemeldete Benutzer kommen daran, je nach Rolle.

### 2.2 GitHub Pages einschalten

**Settings** → **Pages** → bei **Source** die Option **GitHub Actions** wählen.

### 2.3 Werte eintragen

**Settings** → **Secrets and variables** → **Actions**.

Reiter **Secrets** → **New repository secret**:

| Name | Wert |
|---|---|
| `DATABASE_URL` | Verbindungsadresse aus 1.2 |

Reiter **Variables** → **New repository variable**:

| Name | Wert |
|---|---|
| `SUPABASE_URL` | Project URL aus 1.1 |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key aus 1.1 |

Die Namen genau so schreiben (Großbuchstaben, Unterstrich).

### 2.4 Veröffentlichen

**Actions** → links **Veröffentlichen** → rechts **Run workflow** → **Run workflow**.

Nach 3–4 Minuten ist der Lauf grün. Er hat
1. die Tests ausgeführt,
2. die Datenbank in Supabase eingerichtet,
3. die App gebaut und online gestellt.

Danach läuft das bei jeder Änderung auf `main` automatisch.

Wird ein Schritt rot: draufklicken, die Fehlermeldung kopieren und mir schicken. Das ist unbedenklich, denn Secrets zeigt GitHub dort nur als `***` an.

---

## Teil 3: Erster Start

1. **https://bm8jcsctzc-ai.github.io/Makanda-Projekt/** öffnen. Es erscheint die **Ersteinrichtung**.
   Mach das **sofort**: Der erste Zugang wird Inhaber, und bis dahin könnte ihn jeder anlegen, der die Adresse kennt.
2. Unter **Einstellungen › Betrieb & E-Mails** Firmenname, Telefon und Büro-E-Mail eintragen. Das Bundesland ist schon Baden-Württemberg.
3. Unter **Einstellungen › Benutzer** deinen Freund und die Monteure einladen:
   - Name, E-Mail und Rolle eintragen → **Einladen**.
   - Die App zeigt einen **Einladungscode**. Gib ihn der Person (persönlich, per Telefon oder Messenger).
   - Die Person öffnet die App, tippt auf **„Neu hier? Mit Einladungscode registrieren“** und wählt ihr eigenes Passwort.
   - Danach kannst du deinen Freund auf **Inhaber** setzen. Dich selbst kannst du später auf **inaktiv** stellen, wenn das Testen vorbei ist.
4. Auf dem Handy die Adresse öffnen und über das Browser-Menü **„Zum Home-Bildschirm“** hinzufügen. Dann startet sie wie eine normale App.

---

## Teil 4: Echte E-Mails (später)

Bis hierhin läuft der **Testmodus**: Erinnerungen, Wochenbericht und Urlaubs-Mails stehen nur unter **Einstellungen › E-Mail-Protokoll**.

Für echten Versand:
1. Bei **resend.com** anmelden (kostenlos bis 3.000 Mails im Monat) und die **Domain der Firma** bestätigen. Dafür trägt man beim Domain-Anbieter ein paar DNS-Einträge ein, Resend zeigt sie an.
2. Bei Resend einen **API Key** erzeugen.
3. Bei GitHub (**Settings › Secrets and variables › Actions**) eintragen:
   - Secret `RESEND_API_KEY`: der API Key
   - Variable `MAIL_ABSENDER`: z. B. `Mustermann Haustechnik <service@firma.de>` (Adresse mit der bestätigten Domain)

---

## Gut zu wissen

- **Automatik:** Der Ablauf **Automatik** (unter **Actions**) läuft jede Stunde:
  - Er verschickt wartende E-Mails.
  - Tagsüber prüft er die Wartungserinnerungen.
  - Montags schickt er den Wochenbericht mit Excel ans Büro.
  - Von Hand starten: **Actions › Automatik › Run workflow** und die Aufgabe auswählen.
- **GitHub pausiert Zeitpläne** in öffentlichen Projekten, wenn es 60 Tage lang keine Änderung am Code gab. GitHub schickt vorher eine E-Mail. Dann unter **Actions › Automatik** auf **Enable workflow** klicken.
- **Supabase Free** pausiert Projekte nach etwa einer Woche ohne Nutzung. Ist das passiert, im Supabase-Dashboard auf **Restore project** klicken. Für den echten Betrieb ist der Pro-Tarif mit täglicher Datensicherung empfehlenswert.
- **Dateien** dürfen bis 10 MB groß sein (PDF, JPEG, PNG, HEIC, WebP). Fotos verkleinert die App vor dem Hochladen automatisch.
