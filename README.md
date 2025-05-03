# Communityprojekt Spielbrett

[**>> Zur Live-Demo <<**](https://martulex.github.io/community-spielbrett/) 

## Update (03.05.25)
- 🔧 Mobile fix.
  
- 📌 Bei Auswahl des Kürzels in mobile wird nun direkt zum jeweiligen Feld gescrollt.
  
- 🔄 Ladeanzeige im Dropdown hinzugefügt, das Dropdown ist nun erst nutzbar wenn es auch die Daten des Sheets abgerufen hat.

## Update (02.05.25)
- 🔍 Möglichkeit alle Positionen anzuzeigen und das ausgewählte Kürzel mit den anderen zu vergleichen.
- 👀 Visuelles Feedback / Klickbare Felder hinzugefügt.
- ❌ Anzeige kann jetzt zurückgesetzt / gelöscht werden.
- 🖇️ "Persönlicher Link" - Button wird erst bei Auswahl des Kürzels angezeigt.

  Hinweis: Aktuell funktioniert nur die Desktop Version einwandfrei, Mobile Probleme und fehlende Features werden im nächsten Update behoben.

## Projektbeschreibung

Diese Webanwendung dient zur interaktiven Visualisierung des Fortschritts im Rahmen des Moduls "Communityprojekt". Sie stellt ein virtuelles Spielbrett dar, auf dem die Teilnehmerinnen und Teilnehmer ihren aktuellen Punktestand einsehen können. Die Daten werden dynamisch aus einer zentralen Google Tabelle geladen und ermöglichen so eine stets aktuelle Übersicht für die gesamte Gruppe.

## Features

- 🎲 Darstellung eines Spielbretts mit 100 nummerierten Feldern, einem Startfeld und einem Zielfeld.
  
- ❓ Visuelle Hervorhebung spezieller "Ereignisfelder".
  
- 🔄 Dynamisches Laden der Punktestände für alle Teilnehmer (identifiziert durch Kürzel) aus einer Google Tabelle über ein Google Apps Script.
  
- ⬇️ Dropdown-Menü zur Auswahl des eigenen Kürzels.
  
- 💯 Hervorhebung des Feldes auf dem Spielbrett, das dem Punktestand des ausgewählten Teilnehmers entspricht.
  
- 🔍 Möglichkeit die Position aller Teilnehmer anzuzeigen und das ausgewählte Kürzel mit den anderen zu vergleichen.
  
- 🔗 Möglichkeit einen Direktlink zu einem Kürzel zu erstellen.
  
- 📱 Responsive Design.

## Technologie-Stack

- **Design-Entwurf:** Figma
- **Frontend:** HTML5, CSS3 (mit CSS Grid für das Layout), Vanilla JavaScript (ES6+)
- **Datenquelle:** Google Sheets
- **API / Daten-Brücke:** Google Apps Script (als Web-App bereitgestellt)
- **Hosting:** GitHub Pages

## Entwicklungsprozess & KI-Kollaboration

Dieses Projekt wurde im Rahmen des Moduls "Communityprojekt" entwickelt. Die Konzeption des Spielbretts, das ursprüngliche Design in Figma sowie die Projektsteuerung und finale Integration wurden vom Autor durchgeführt.

Während der technischen Umsetzung der Webanwendung wurde **Gemini 2.5 Pro Experimental (KI-Modell von Google)** als unterstützendes Werkzeug eingesetzt.

Die **Eigenleistung** des Autors lag in der Definition der Anforderungen, der Erstellung des visuellen Designs, der Anpassung und Integration der Code-Snippets, dem Setup der Google-Sheet-Struktur, der Durchführung des Deployments (Apps Script, GitHub Pages), dem systematischen Testen und Debugging sowie der finalen Ausgestaltung des Projekts. Die KI diente hierbei als Werkzeug zur Beschleunigung der Entwicklung und zur Überwindung technischer Hürden.
