# Makanda-Projekt

Betriebs-App für einen SHK-Betrieb (Heizung, Klima, Sanitär) als Ergänzung zu TAIFUN.
Der technische Gesamtplan steht in [`docs/BAUPLAN.md`](docs/BAUPLAN.md).

## Was die App schon kann

**Einsätze, Kunden, Anlagen**
- **Heute:** Jeder sieht seine Einsätze des Tages und der nächsten Tage. Inhaber und Büro sehen zusätzlich alle Einsätze des Tages.
- **Einsätze planen:** Kunde, Anlage, Monteur, Datum und Uhrzeit, Art (Wartung, Störung, Montage). Warnung, wenn ein Einsatz noch keinen Monteur hat.
- **Einsatz am Handy:** Kundenhinweise, Navigation, Anruf-Knopf, Checklisten, Fotos, Abschluss mit Bemerkung
- **Kunden:** Adresse, Kontakt, Hinweise für Monteure, TAIFUN-Kundennummer, Suche
- **Digitale Anlagenakte:** technische Daten, Wartungsintervall, nächste Wartung (überfällige rot), Fotos, alle Checklisten mit Auffälligkeiten

**Wartungsplan**
- alle fälligen Wartungen nach Monat: überfällig, bald fällig, Termin geplant, Kunde erinnert
- **Warnung bei Häufungen:** Monate mit mind. 50 % mehr Wartungen als im Durchschnitt (oder über einer selbst gesetzten Grenze), mit Tipp, in welche Monate man Termine vorziehen kann
- „Termin planen“ direkt aus der Liste (Kunde, Anlage und Datum werden übernommen)
- **Excel-Export** aller Wartungskunden (eine Zeile pro Anlage, mit Filter) plus Monatsübersicht
- **Automatische E-Mails:**
  - täglich: Erinnerung an Kunden X Monate vor der Wartung (Standard: 3) und eine Übersicht ans Büro, welche Kunden ohne E-Mail angerufen werden müssen. Pro Fälligkeit nur einmal, nicht wenn schon ein Termin geplant ist, nicht an Kunden, die keine Erinnerungen wollen
  - montags: Excel mit allen Wartungskunden an das Büro, mit Hinweis auf überfällige Wartungen und Häufungen
  - Text der Erinnerung unter Einstellungen › Betrieb & E-Mails anpassbar, mit Vorschau
  - **Testmodus**, solange kein Mail-Dienst eingerichtet ist: Mails erscheinen nur im E-Mail-Protokoll

**Urlaubsplaner**
- Monteure beantragen Urlaub selbst (auch halbe Tage), der Inhaber genehmigt oder lehnt mit Begründung ab – beide bekommen eine E-Mail
- Arbeitstage werden automatisch berechnet: ohne Wochenenden und gesetzliche Feiertage des eingestellten Bundeslands
- Beim Genehmigen: Hinweis, wer gleichzeitig fehlt und welche Einsätze in der Zeit geplant sind
- Inhaber und Büro tragen Krankheit, Berufsschule und Sonstiges ein (gilt sofort)
- Teamkalender pro Monat; Kollegen sehen nur „abwesend“, nicht den Grund
- Urlaubskonto pro Jahr: Anspruch, Übertrag aus dem Vorjahr, genehmigt, beantragt, Rest
- Einsatzplanung warnt, wenn der Monteur an dem Tag abwesend ist; „Heute abwesend“ auf der Startseite

**Checklisten**
- Vorlagen für Wartung von Gas-Brennwertgerät, Öl-Heizung, Wärmepumpe und Klimaanlage sowie für Störung/Reparatur
- Prüfpunkte (i. O. / nicht i. O. / entfällt), Messwerte mit Richtwert-Warnung, Freitext und Bemerkungen
- Pflichtfelder, Zwischenspeichern, Druckansicht (als PDF speichern)
- Eine abgeschlossene Wartung setzt automatisch das nächste Wartungsdatum der Anlage.
- Vorlagen lassen sich unter Einstellungen › Checklisten anpassen. Bereits ausgefüllte Checklisten bleiben unverändert.

**Fotos**
- direkt mit der Handykamera, mehrere auf einmal, mit Kategorie (Typenschild, vorher/nachher, Messwert, Schaden)
- werden vor dem Hochladen automatisch verkleinert (spart mobile Daten)

**Finanzen**
- **Übersicht:** Kosten pro Monat, Vergleich zum Vormonat, Verlauf über 12 Monate, Aufteilung nach Kategorie, offene und überfällige Rechnungen
- **Rechnungen:** PDF oder Handyfoto hochladen, Betrag, Kategorie, Fälligkeit, „bezahlt“-Status, Filter nach Monat, Kategorie und Status
- **Fixkosten:** regelmäßige Kosten (monatlich bis jährlich), automatisch auf den Monat umgerechnet
- **Gehälter:** Brutto und Arbeitgeberanteile pro Mitarbeiter, mit Gültigkeitszeitraum (nur Inhaber)

**Zugänge und Rollen**

| Rolle | darf |
|---|---|
| Inhaber | alles, auch Gehälter, Benutzer und Urlaub genehmigen |
| Büro | Einsätze planen, Kunden, Checklisten-Vorlagen, Abwesenheiten eintragen, Rechnungen, Fixkosten (keine Gehälter, keine Benutzer, kein Genehmigen) |
| Monteur | eigene Einsätze bearbeiten (Checkliste, Fotos, Abschluss), Kunden und Anlagen ansehen, Anlagendaten erfassen, Urlaub beantragen – keine Finanzen |

**Wer darf was** wird in der Datenbank selbst geprüft (`supabase/migrations/0002_funktionen.sql`): Die App kann nur über geprüfte Funktionen lesen und schreiben, nie direkt auf Tabellen oder fremde Dateien zugreifen. Neue Mitarbeiter registrieren sich mit einem Einladungscode vom Inhaber.

## Online stellen

Schritt-für-Schritt-Anleitung: [`docs/ONLINE.md`](docs/ONLINE.md). Die App läuft auf **GitHub Pages**, Daten und Anmeldung liegen bei **Supabase** (Rechenzentrum Frankfurt).

| Einstellung bei GitHub (Settings › Secrets and variables › Actions) | Art | Zweck |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Variable | Supabase-Projekt, mit dem die App spricht (öffentlich) |
| `DATABASE_URL` | Secret | Datenbank-Verbindung („Session pooler“) für Datenbank-Updates und Automatik |
| `RESEND_API_KEY` | Secret | echter E-Mail-Versand über [Resend](https://resend.com); ohne läuft der Testmodus |
| `MAIL_ABSENDER` | Variable | z. B. `Mustermann Haustechnik <service@firma.de>` |

Zwei Abläufe in `.github/workflows/`:
- **Veröffentlichen** (bei jeder Änderung auf `main`): Tests, Datenbank-Updates aus `supabase/migrations/`, App bauen und auf GitHub Pages stellen
- **Automatik** (stündlich): Wartungserinnerungen, Wochenbericht, wartende E-Mails verschicken (`scripts/aufgaben.mts`)

## Auf dem eigenen Rechner ausprobieren

Voraussetzung: [Node.js](https://nodejs.org) ab Version 20. Ein Supabase-Konto ist dafür nicht nötig: Ein Nachbau von Supabase läuft lokal mit (`scripts/supabase-attrappe.mts`).

```bash
npm install
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=lokal npm run build
npm run attrappe
```

Dann im Browser <http://localhost:3100> öffnen. Beim allerersten Start erscheint die **Ersteinrichtung**. Der erste Zugang wird Inhaber. Die Daten sind nach dem Beenden weg. Mit `ATTRAPPE_DATEN=./data/attrappe npm run attrappe` bleiben sie erhalten.

## Für Entwickler

```bash
npm test              # Rechenlogik, Rechte der Datenbank-Funktionen, Automatik
npm run test:e2e      # Browser-Tests gegen die gebaute App mit frischer Attrappe (siehe oben)
npm run lint          # Code-Prüfung
npm run migrieren     # Datenbank-Updates einspielen (DATABASE_URL nötig)
npm run aufgaben -- erinnerungen   # Automatik von Hand (auto | erinnerungen | wochenbericht | mails)
```

Technik: Next.js 15 (statischer Export), TypeScript, Tailwind CSS, Supabase (Postgres, Auth, Storage).
Neue Datenbank-Änderungen als neue Datei `supabase/migrations/0006_….sql` anlegen. Bestehende Dateien nicht mehr ändern, sie sind in Supabase schon eingespielt.
