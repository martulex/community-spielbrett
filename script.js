const G_SHEET_URL = "https://script.google.com/macros/s/AKfycbxsYYnSqns4_8mjb-BpUyhO-npPQQEBKNRsUXp8rEprc546bk_v1k3wiTynfLDbaK0Apw/exec"; // <-- URL

// Globale Variablen
let scoreData = null;
let kuerzelPopulated = false;
let fieldToPlayersMap = {}; // Map: fieldId -> [kuerzel1, kuerzel2, ...]
let currentSelectedKuerzel = ""; // Speichert das aktuell ausgewählte Kürzel

// Funktion zum Generieren des Spielbretts
function generateBoard() {
    const spielbrettContainer = document.getElementById('spielbrett-container');
    spielbrettContainer.innerHTML = '';
    const anzahlFelder = 100;
    const ereignisFelder = [14, 40, 56, 77, 93];

    // Start-Feld
    const startFeld = document.createElement('div');
    startFeld.classList.add('spielbrett-feld', 'start-feld');
    startFeld.setAttribute('data-field-id', 'start');
    startFeld.textContent = 'Start';
    spielbrettContainer.appendChild(startFeld);

    // Felder 1 bis 100
    for (let i = 1; i <= anzahlFelder; i++) {
        const feld = document.createElement('div');
        feld.classList.add('spielbrett-feld');
        feld.setAttribute('data-field-id', i);

        if (i === 100) {
            feld.classList.add('ziel-feld');
            feld.textContent = i;
        } else if (ereignisFelder.includes(i)) {
            feld.classList.add('ereignis-feld');
            feld.textContent = '?';
        } else {
            feld.textContent = i;
        }
        spielbrettContainer.appendChild(feld);
    }
    console.log('Spielbrett-Felder (Start bis 100) generiert.');
}

// Funktion zum Vorverarbeiten der Daten
function preprocessScoreData(data) {
    const map = {};
    for (const kuerzel in data) {
        let score = data[kuerzel];
        let fieldId = (typeof score === 'number' && score >= 1 && score <= 100) ? score.toString() : 'start';
        if (!map[fieldId]) {
            map[fieldId] = [];
        }
        map[fieldId].push(kuerzel);
    }
    console.log("Daten vorverarbeitet (Feld -> Spieler):", map);
    fieldToPlayersMap = map; // Global speichern
}

// NEU: Funktion zum Ein-/Ausblenden des "Link kopieren"-Buttons
function updateCopyLinkButtonVisibility() {
    const selectElement = document.getElementById('kuerzel-select');
    const copyButton = document.getElementById('copy-link-btn');

    if (copyButton && selectElement) { // Sicherstellen, dass beide Elemente da sind
        if (selectElement.value) { // Wenn ein Kürzel ausgewählt ist (Wert nicht leer)
            copyButton.classList.remove('hidden'); // Klasse entfernen -> Button sichtbar
        } else { // Wenn "--Bitte wählen--" ausgewählt ist (Wert ist leer)
            copyButton.classList.add('hidden'); // Klasse hinzufügen -> Button versteckt
        }
    }
}

function showAllPositions() {
    try {
        console.log("--- showAllPositions START ---");
        console.log(`Aktuell ausgewähltes Kürzel: ${currentSelectedKuerzel}`); 

        const alleFelder = document.querySelectorAll('.spielbrett-feld');
        if (!alleFelder || alleFelder.length === 0) {
             console.error("FEHLER: Keine '.spielbrett-feld' Elemente gefunden!");
             return;
        }
        console.log(`Gefundene Felder insgesamt: ${alleFelder.length}`);

        // 1. Klassen und Titel zurücksetzen
        let otherPlayerClassesRemoved = 0;
        alleFelder.forEach(f => {
            if (f.classList.contains('other-player')) {
                 f.classList.remove('other-player');
                 otherPlayerClassesRemoved++;
            }
            f.title = '';
        });
        console.log(`${otherPlayerClassesRemoved} '.other-player' Klassen entfernt.`);

        // 2. Daten prüfen
        if (!fieldToPlayersMap) {
            console.error("FEHLER: fieldToPlayersMap ist nicht definiert!");
            return;
        }
         if (Object.keys(fieldToPlayersMap).length === 0) {
            console.warn("WARNUNG: fieldToPlayersMap ist leer. Keine Positionen zum Anzeigen.");
            console.log("--- showAllPositions END (keine Daten) ---");
            return;
        }
        console.log("fieldToPlayersMap Daten:", JSON.parse(JSON.stringify(fieldToPlayersMap))); // Zeigt die Daten an 

        // 3. Felder markieren
        let fieldsProcessed = 0;
        let otherPlayerClassesAdded = 0;
        let activePlayerFieldsSkipped = 0;

        for (const fieldId in fieldToPlayersMap) {
            fieldsProcessed++;
            const playersOnField = fieldToPlayersMap[fieldId];
            const targetField = document.querySelector(`.spielbrett-feld[data-field-id="${fieldId}"]`);

            if (targetField && playersOnField && playersOnField.length > 0) {
                targetField.title = `Spieler: ${playersOnField.join(', ')}`; // Eindeutiger Tooltip

                const isActive = targetField.classList.contains('active-player');

                if (!isActive) {
                    targetField.classList.add('other-player');
                    otherPlayerClassesAdded++;
                    // console.log(`   -> '.other-player' zu Feld ${fieldId} hinzugefügt.`); 
                } else {
                    activePlayerFieldsSkipped++;
                     // console.log(`   -> Feld ${fieldId} ist '.active-player', '.other-player' übersprungen.`); 
                }
            } else if (!targetField) {
                 console.warn(`WARNUNG: Kein DOM-Element für Feld-ID '${fieldId}' gefunden.`);
            }
        }

        console.log(`Verarbeitete Felder aus Map: ${fieldsProcessed}`);
        console.log(`'.other-player' Klassen hinzugefügt: ${otherPlayerClassesAdded}`);
        console.log(`Felder als '.active-player' übersprungen: ${activePlayerFieldsSkipped}`);

        // 4. Button Sichtbarkeit aktualisieren
        if (typeof updateCopyLinkButtonVisibility === 'function') {
            updateCopyLinkButtonVisibility();
            console.log("updateCopyLinkButtonVisibility aufgerufen.");
        } else {
            // console.log("updateCopyLinkButtonVisibility nicht als Funktion gefunden."); 
        }

        console.log("--- showAllPositions END ---");

     } catch (error) {
         console.error("FEHLER in showAllPositions:", error);
     }
}

// Funktion zum Anzeigen der Position eines EINZELNEN Spielers
function showSinglePlayerPosition(selectedKuerzel) {
    const alleFelder = document.querySelectorAll('.spielbrett-feld');
    // 1. Alle alten Markierungen und Tooltips entfernen
    alleFelder.forEach(f => {
        f.classList.remove('active-player', 'other-player');
        f.title = '';
    });

    // 2. Wenn kein Kürzel gewählt, nichts tun
    if (!selectedKuerzel) {
         console.log("Kein Kürzel ausgewählt, keine Markierung.");
         return;
    }

    // 3. Score holen und Feld finden
    if (!scoreData) {
        console.warn("Score-Daten noch nicht verfügbar für showSinglePlayerPosition.");
        return; // Daten müssen da sein
    }
    const score = scoreData[selectedKuerzel];
    let targetFieldId = (typeof score === 'number' && score >= 1 && score <= 100) ? score : 'start';
    const targetField = document.querySelector(`.spielbrett-feld[data-field-id="${targetFieldId}"]`);

    // 4. Neues Highlight setzen und SCROLLEN
    if (targetField) {
        targetField.classList.add('active-player');
        console.log(`Feld ${targetFieldId} für ${selectedKuerzel} hervorgehoben.`);

        targetField.scrollIntoView({
            behavior: 'smooth', // Sanftes Scrollen
            block: 'center',    // Vertikal zentrieren (oder 'start', 'end', 'nearest')
            inline: 'nearest'   // Horizontal nur wenn nötig
        });

    } else {
        console.warn(`Konnte Feld mit ID ${targetFieldId} nicht finden.`);
    }
}

// Funktion zum Aktualisieren der Spielerliste
function updatePlayerList(data) {
    console.log("Aktualisiere Spielerliste (Funktion noch nicht implementiert).");
    const listElement = document.getElementById('player-list');
    if (!listElement) return; // Beenden, wenn das Listenelement nicht existiert

    // Einfache Implementierung: Liste löschen und neu aufbauen
    listElement.innerHTML = ''; // Alte Einträge entfernen

    if (!data || Object.keys(data).length === 0) {
        listElement.innerHTML = '<li>Keine Spielerdaten vorhanden.</li>';
        return;
    }

    // Spielerdaten in ein Array umwandeln und sortieren
    const sortedPlayers = Object.entries(data) // Ergibt [ [kuerzel, score], [kuerzel, score], ... ]
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA); // Nach Score absteigend sortieren

    // Listeneinträge erstellen
    sortedPlayers.forEach(([kuerzel, score]) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${kuerzel}: ${score}`;
        listElement.appendChild(listItem);
    });
}


// Funktion zum Abrufen der Scores, Vorverarbeiten und Füllen des Dropdowns
async function fetchScoresAndPopulateDropdown() {
    const selectElement = document.getElementById('kuerzel-select');
    const initialOption = selectElement.options[0]; // Die "-- Lädt Daten..." Option merken

    // Sicherstellen, dass es deaktiviert ist und "Lädt..." anzeigt
    selectElement.disabled = true;
    initialOption.textContent = '-- Lädt Daten... --';

    console.log("Versuche Scores abzurufen von:", G_SHEET_URL);
    try {
        const response = await fetch(G_SHEET_URL);
        if (!response.ok) {
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        }
        scoreData = await response.json();
        console.log("Daten erfolgreich abgerufen:", scoreData);

        // Daten vorverarbeiten
        preprocessScoreData(scoreData);
        updatePlayerList(scoreData); // Liste aktualisieren

        if (scoreData) {
            // Dropdown füllen (diese Funktion wird unten angepasst)
            populateKuerzelDropdown(Object.keys(scoreData));
            // Nach erfolgreichem Füllen: Dropdown aktivieren
            selectElement.disabled = false; // HIER aktivieren
            console.log("Dropdown aktiviert.");
        } else {
             // Fall: Keine Daten zurückbekommen, aber kein Fehler?
             initialOption.textContent = '-- Keine Daten --';
             selectElement.disabled = true; // Bleibt deaktiviert
        }

    } catch (error) {
        console.error("Fehler beim Abrufen der Daten:", error);
        const listElement = document.getElementById('player-list');
        if(listElement) listElement.innerHTML = '<li>Fehler beim Laden!</li>';
        alert("Fehler beim Laden der Punktestände. Bitte prüfe die URL und die Freigabe des Apps Scripts.");

        // Wichtig: Fehler im Dropdown anzeigen und deaktiviert lassen
        initialOption.textContent = '-- Fehler! --';
        selectElement.disabled = true;
    }
}

// Funktion zum Füllen des Dropdown-Menüs 
function populateKuerzelDropdown(kuerzelListe) {
    const selectElement = document.getElementById('kuerzel-select');
    const currentVal = selectElement.value; // Merken, was gerade ausgewählt ist

    // --- NEUE, ZUVERLÄSSIGE Logik zum Leeren ---
    // Entferne alle Optionen ab der zweiten (Index 1), behalte die erste (Index 0)
    while (selectElement.options.length > 1) {
        selectElement.remove(1); // Entfernt immer die Option an Index 1 (die nachfolgenden rutschen nach)
    }
    // Setze Text/Wert der ersten Option zurück (ist entweder "-- Lädt..." oder "-- Bitte wählen --")
    selectElement.options[0].textContent = '-- Bitte wählen --';
    selectElement.options[0].value = '';
    // -------------------------------------------

    // Kürzel sortieren
    kuerzelListe.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    // Die eigentlichen Kürzel-Optionen hinzufügen
    kuerzelListe.forEach(kuerzel => {
        const option = document.createElement('option');
        option.value = kuerzel;
        option.textContent = kuerzel;
        selectElement.appendChild(option);
    });

    // Vorherige Auswahl wiederherstellen, falls das Kürzel noch existiert
    if (selectElement.querySelector(`option[value="${currentVal}"]`)) {
         selectElement.value = currentVal;
    } else {
         // Wenn der alte Wert nicht mehr da ist (z.B. Kürzel gelöscht), auf Default zurücksetzen
         selectElement.value = "";
    }
    console.log("Dropdown mit Kürzeln gefüllt (Refresh-sicher).");
    // Das Aktivieren (selectElement.disabled = false;) passiert ja in fetchScoresAndPopulateDropdown
}


// Event Listener hinzufügen, wenn das HTML geladen ist
document.addEventListener('DOMContentLoaded', async function() {
    generateBoard();

    
    await fetchScoresAndPopulateDropdown(); // Lädt Daten, füllt Dropdown+Liste

    // URL Parameter Handling
    const urlParams = new URLSearchParams(window.location.search);
    const playerKuerzelFromUrl = urlParams.get('player');
    if (playerKuerzelFromUrl && scoreData && scoreData[playerKuerzelFromUrl] !== undefined) {
        const selectElement = document.getElementById('kuerzel-select');
        selectElement.value = playerKuerzelFromUrl;
        currentSelectedKuerzel = playerKuerzelFromUrl; // Global setzen
        showSinglePlayerPosition(playerKuerzelFromUrl); // Zeigt nur diesen Spieler
        console.log(`Kürzel ${playerKuerzelFromUrl} aus URL Parameter ausgewählt.`);
    }

    // Event Listener für das Dropdown-Menü (Select)
    const selectElement = document.getElementById('kuerzel-select');
    if (selectElement) {
        selectElement.addEventListener('change', function() {
             currentSelectedKuerzel = this.value; 
             showSinglePlayerPosition(this.value); 

             
             const showAllButton = document.getElementById('show-all-btn');
             if (showAllButton) {
                 showAllButton.textContent = currentSelectedKuerzel ? 'Vergleichen' : 'Alle Positionen anzeigen';
             }

             // NEU: Sichtbarkeit des Copy-Buttons aktualisieren
             updateCopyLinkButtonVisibility(); 
        }); 
    }


    // Event Listener für den "Aktualisieren"-Button
    const refreshButton = document.getElementById('refresh-data-btn');
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => { 
            console.log("Aktualisiere Daten...");
            refreshButton.textContent = "Lade..."; 
            refreshButton.disabled = true; 

            const selectElement = document.getElementById('kuerzel-select'); 
            const previouslySelectedKuerzel = selectElement.value; 

            // Daten holen, vorverarbeiten, Liste updaten, Dropdown updaten
            await fetchScoresAndPopulateDropdown(); 

            if (previouslySelectedKuerzel && selectElement.querySelector(`option[value="${previouslySelectedKuerzel}"]`)) {
                 selectElement.value = previouslySelectedKuerzel;                     
            }
            currentSelectedKuerzel = selectElement.value; // Nimm den Wert, der JETZT ausgewählt ist

            updateCopyLinkButtonVisibility(); // Sichtbarkeit Copy-Button anpassen

            showSinglePlayerPosition(currentSelectedKuerzel); 

            refreshButton.textContent = "Daten aktualisieren"; 
            refreshButton.disabled = false;
            console.log("Daten aktualisiert.");
        });
    }

    // Event Listener für den "Alle Positionen anzeigen"-Button
    const showAllButton = document.getElementById('show-all-btn');
    if (showAllButton) {
        showAllButton.addEventListener('click', showAllPositions);
    }

   // Funktion zum Löschen aller Markierungen und Zurücksetzen der Auswahl
function clearBoardDisplay() {
    console.log("Lösche Brett-Anzeige und setze Auswahl zurück.");
    const alleFelder = document.querySelectorAll('.spielbrett-feld');

    // 1. Alle Markierungen (.active-player, .other-player) und Tooltips entfernen
    alleFelder.forEach(f => {
        f.classList.remove('active-player', 'other-player');
        f.title = ''; 
    });

    // 2. Dropdown auf "--Bitte wählen--" zurücksetzen
    const selectElement = document.getElementById('kuerzel-select');
    if (selectElement) selectElement.value = ""; 

    // 3. Globalen Merker für die Auswahl zurücksetzen
    currentSelectedKuerzel = ""; 

    // 4. Den Text des "Alle anzeigen"/"Vergleichen"-Buttons zurücksetzen
    const showAllButton = document.getElementById('show-all-btn');
     if (showAllButton) {
         showAllButton.textContent = 'Alle Positionen anzeigen';
         updateCopyLinkButtonVisibility();
     }
}
    // Klick-Listener für Felder hinzufügen ---
const spielbrettContainer = document.getElementById('spielbrett-container');
if (spielbrettContainer) {
    spielbrettContainer.addEventListener('click', function(event) {
        // Finde heraus, ob auf ein Feld geklickt wurde
        const targetField = event.target.closest('.spielbrett-feld'); 

        if (targetField) { // Nur wenn auf ein Feld geklickt wurde
            const fieldId = targetField.getAttribute('data-field-id');

            // Prüfe, ob für dieses Feld Spieler in unserer Map existieren
            if (fieldId && fieldToPlayersMap[fieldId] && fieldToPlayersMap[fieldId].length > 0) { 
                const playersOnField = fieldToPlayersMap[fieldId];
                // Zeige die Spieler in einer Alert-Box an
                alert(`Spieler auf Feld ${fieldId === 'start' ? 'Start' : fieldId}: ${playersOnField.join(', ')}`);
            } else if (fieldId) {
                // Optional: Meldung für leere Felder anzeigen
                // alert(`Feld ${fieldId === 'start' ? 'Start' : fieldId} ist leer.`);
                console.log(`Feld ${fieldId} geklickt, aber keine Spieler darauf.`);
            }
        }
    });
}
// --- Ende Klick-Listener für Felder ---

    // Event Listener für den "Link kopieren"-Button
    const copyButton = document.getElementById('copy-link-btn');
    if (copyButton) {
        copyButton.addEventListener('click', function() {
            const selectedKuerzel = selectElement.value; // Aktuellen Wert nehmen

            if (!selectedKuerzel) {
                alert("Bitte wähle zuerst dein Kürzel aus, um einen Link zu kopieren.");
                return;
            }
            const baseUrl = window.location.origin + window.location.pathname;
            const personalUrl = `${baseUrl}?player=${selectedKuerzel}`; 

            navigator.clipboard.writeText(personalUrl).then(function() {
                console.log('Link erfolgreich kopiert:', personalUrl);
                copyButton.textContent = 'Kopiert!';
                copyButton.disabled = true;
                setTimeout(() => {
                    copyButton.textContent = 'Persönlichen Link kopieren';
                    copyButton.disabled = false;
                }, 2000);
            }).catch(function(err) {
                console.error('Fehler beim Kopieren des Links: ', err);
                alert('Konnte den Link leider nicht kopieren.');
            });
        });
    }

    // Event Listener für den "Anzeige löschen"-Button
    const clearButton = document.getElementById('clear-board-btn');
    if (clearButton) {
        clearButton.addEventListener('click', clearBoardDisplay);
    }

    updateCopyLinkButtonVisibility();

}); // Ende von DOMContentLoaded
