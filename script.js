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

// Funktion zum Anzeigen ALLER ANDEREN Spielerpositionen ZUSÄTZLICH zur Auswahl
function showAllPositions() {
    // Die globale Variable 'currentSelectedKuerzel' enthält das aktuell ausgewählte Kürzel
    console.log(`Zeige alle Positionen an. Aktuell ausgewählt: ${currentSelectedKuerzel}`);
    const alleFelder = document.querySelectorAll('.spielbrett-feld');

    // 1. Nur die '.other-player' Highlights entfernen 
    //    Lasse eine eventuell vorhandene '.active-player' Markierung bestehen
    alleFelder.forEach(f => {
        f.classList.remove('other-player'); // Nur 'other-player' entfernen
        f.title = '';                     // Alle alten Tooltips entfernen
    });

    // 2. Dropdown NICHT zurücksetzen. Die aktuelle Auswahl im Dropdown bleibt bestehen.

    // 3. Neue '.other-player' Markierungen für alle Felder setzen
    if (!fieldToPlayersMap || Object.keys(fieldToPlayersMap).length === 0) {
        console.log("Keine Daten zum Anzeigen aller Positionen vorhanden.");
        return;
    }

    for (const fieldId in fieldToPlayersMap) {
        const playersOnField = fieldToPlayersMap[fieldId];
        const targetField = document.querySelector(`.spielbrett-feld[data-field-id="${fieldId}"]`);

        if (targetField && playersOnField.length > 0) {
            // Tooltip immer für alle besetzten Felder setzen 

            // Prüfen, ob das Feld bereits die 'active-player' Klasse hat
            const isActive = targetField.classList.contains('active-player');

            // Die 'other-player' Klasse nur hinzufügen, wenn das Feld NICHT der aktive Spieler ist.
            if (!isActive) {
                 targetField.classList.add('other-player'); 
            }
            // Wenn das Feld 'active-player' ist, bleibt es einfach so (gelb).
        }
    }
    updateCopyLinkButtonVisibility();
    console.log("Alle anderen Positionen zusätzlich markiert.");
} // Ende der NEUEN showAllPositions Funktion

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

    // 4. Neues Highlight und Tooltip setzen
    if (targetField) {
        targetField.classList.add('active-player'); // Nur der ausgewählte wird 'active'

        // Finde alle Spieler auf diesem Feld für den Tooltip
        
        const playersOnThisField = fieldToPlayersMap[targetFieldId.toString()] || [];
        console.log(`Feld ${targetFieldId} für ${selectedKuerzel} hervorgehoben.`);
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

      
        updatePlayerList(scoreData);


        if (scoreData) {
            populateKuerzelDropdown(Object.keys(scoreData));
        }

    } catch (error) {
        console.error("Fehler beim Abrufen der Daten:", error);
        const listElement = document.getElementById('player-list');
        if(listElement) listElement.innerHTML = '<li>Fehler beim Laden!</li>';
        alert("Fehler beim Laden der Punktestände. Bitte prüfe die URL und die Freigabe des Apps Scripts.");
    }
}

// Funktion zum Füllen des Dropdown-Menüs
function populateKuerzelDropdown(kuerzelListe) {
    const selectElement = document.getElementById('kuerzel-select');
    // Merke dir das aktuell ausgewählte Kürzel, falls vorhanden
    const currentVal = selectElement.value;
    selectElement.length = 1; // Behält nur "--Bitte wählen--"

    kuerzelListe.sort();

    kuerzelListe.forEach(kuerzel => {
        const option = document.createElement('option');
        option.value = kuerzel;
        option.textContent = kuerzel;
        selectElement.appendChild(option);
    });
    // Versuche, die vorherige Auswahl wiederherzustellen
    if (selectElement.querySelector(`option[value="${currentVal}"]`)) {
         selectElement.value = currentVal;
    }
    console.log("Dropdown mit Kürzeln gefüllt.");
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