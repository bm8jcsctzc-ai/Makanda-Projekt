# Makanda-Projekt

Betriebs-App für einen SHK-Betrieb (Heizung, Klima, Sanitär) als Ergänzung zu TAIFUN.
Der technische Gesamtplan steht in [`docs/BAUPLAN.md`](docs/BAUPLAN.md).

## Was die App schon kann

**Finanzen**
- **Übersicht:** Kosten pro Monat, Vergleich zum Vormonat, Verlauf über 12 Monate, Aufteilung nach Kategorie, offene und überfällige Rechnungen
- **Rechnungen:** PDF oder Handyfoto hochladen, Betrag, Kategorie, Fälligkeit, „bezahlt“-Status, Filter nach Monat, Kategorie und Status
- **Fixkosten:** regelmäßige Kosten (monatlich bis jährlich), automatisch auf den Monat umgerechnet
- **Gehälter:** Brutto und Arbeitgeberanteile pro Mitarbeiter, mit Gültigkeitszeitraum (nur Inhaber)

**Zugänge und Rollen**

| Rolle | darf |
|---|---|
| Inhaber | alles, auch Gehälter und Benutzer verwalten |
| Büro | Übersicht, Rechnungen, Fixkosten (keine Gehälter) |
| Monteur | eigene Startseite (Einsätze, Checklisten und Fotos folgen) |

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

Die Ablage der hochgeladenen Dateien (`src/lib/dateien.ts`) wird für den Live-Betrieb noch auf einen Cloud-Speicher umgestellt.

## Für Entwickler

```bash
npm test              # Tests der Rechenlogik
npm run lint          # Code-Prüfung
npm run build         # Produktions-Build
npm run db:migration  # nach Änderungen an src/db/schema.ts neue Migration erzeugen
```

Technik: Next.js 15, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL (lokal über PGlite).
