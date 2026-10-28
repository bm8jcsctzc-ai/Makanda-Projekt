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
  - Text der Erinnerung unter Einstellungen › Wartung & E-Mails anpassbar, mit Vorschau
  - **Testmodus**, solange kein Mail-Dienst eingerichtet ist: Mails erscheinen nur im E-Mail-Protokoll

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
| Inhaber | alles, auch Gehälter und Benutzer verwalten |
| Büro | Einsätze planen, Kunden, Checklisten-Vorlagen, Rechnungen, Fixkosten (keine Gehälter, keine Benutzer) |
| Monteur | eigene Einsätze bearbeiten (Checkliste, Fotos, Abschluss), Kunden und Anlagen ansehen, Anlagendaten erfassen – keine Finanzen |

## Auf dem eigenen Rechner starten

Voraussetzung: [Node.js](https://nodejs.org) ab Version 20.

```bash
npm install
npm run dev
```

Dann im Browser <http://localhost:3000> öffnen. Beim allerersten Start erscheint die **Ersteinrichtung**. Dort legst du den ersten Zugang an, er bekommt die Rolle Inhaber.

Es ist **kein Datenbank-Konto nötig**. Ohne weitere Einstellungen nutzt die App eine eingebaute Datenbank im Ordner `data/`, dort liegen auch die hochgeladenen Dateien. Der Ordner wird nicht ins Git-Repository übernommen. Zum Zurücksetzen den Ordner `data/` löschen.

## Für den Live-Betrieb (später)

| Einstellung | Zweck |
|---|---|
| `DATABASE_URL` | Verbindung zu einer Postgres-Datenbank, z. B. Supabase. Die Tabellen werden beim Start automatisch angelegt. |
| `SESSION_SECRET` | langer Zufallswert zum Absichern der Anmeldung |
| `RESEND_API_KEY`, `MAIL_ABSENDER` | echter E-Mail-Versand über [Resend](https://resend.com), z. B. `MAIL_ABSENDER="Mustermann Haustechnik <service@firma.de>"`. Ohne diese Werte läuft der Testmodus. |
| `CRON_SECRET` | Zufallswert, schützt die Adressen `/api/cron/taeglich` und `/api/cron/woechentlich`. Auf Vercel ruft der Zeitplaner sie laut `vercel.json` automatisch auf. |

Die Ablage der hochgeladenen Dateien (`src/lib/dateien.ts`) wird für den Live-Betrieb noch auf einen Cloud-Speicher umgestellt.

## Für Entwickler

```bash
npm test              # Tests der Rechenlogik
npm run test:e2e      # Browser-Tests (App muss mit leerer Datenbank auf Port 3100 laufen: rm -rf data && PORT=3100 npm start)
npm run lint          # Code-Prüfung
npm run build         # Produktions-Build
npm run db:migration  # nach Änderungen an src/db/schema.ts neue Migration erzeugen
```

Technik: Next.js 15, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL (lokal über PGlite).
