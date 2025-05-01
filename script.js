const G_SHEET_URL = "https://script.google.com/macros/s/AKfycbxsYYnSqns4_8mjb-BpUyhO-npPQQEBKNRsUXp8rEprc546bk_v1k3wiTynfLDbaK0Apw/exec"; // <-- URL

// Globale Variable, um die abgerufenen Daten zu speichern
let scoreData = null; 
let kuerzelPopulated = false; // Merker, ob Dropdown gefüllt ist

// Funktion zum Generieren des Spielbretts (Start bis 100)
function generateBoard() {
    const spielbrettContainer = document.getElementById('spielbrett-container');
    // Leeren, falls schon was drin ist (für spätere Updates relevant)
    spielbrettContainer.innerHTML = ''; 

    const anzahlFelder = 100; // Felder 1 bis 100
    const ereignisFelder = [14, 40, 56, 77, 93]; // Deine Ereignisfelder

    // 1. Start-Feld erstellen
    const startFeld = document.createElement('div');
    startFeld.classList.add('spielbrett-feld', 'start-feld');
    startFeld.setAttribute('data-field-id', 'start'); 
    startFeld.textContent = 'Start';
    spielbrettContainer.appendChild(startFeld);

    // 2. Felder 1 bis 100 erstellen
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

// Funktion zum Abrufen der Scores und Füllen des Dropdowns
async function fetchScoresAndPopulateDropdown() {
    console.log("Versuche Scores abzurufen von:", G_SHEET_URL);
    try {
        const response = await fetch(G_SHEET_URL);
        if (!response.ok) {
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        }
        scoreData = await response.json(); // Speichere die Daten global
        console.log("Daten erfolgreich abgerufen:", scoreData);

        // Fülle das Dropdown-Menü, aber nur einmal
        if (scoreData) {
            populateKuerzelDropdown(Object.keys(scoreData));
        }

    } catch (error) {
        console.error("Fehler beim Abrufen der Daten:", error);
        alert("Fehler beim Laden der Punktestände. Bitte prüfe die URL und die Freigabe des Apps Scripts.");
    }
}

// Funktion zum Füllen des Dropdown-Menüs
function populateKuerzelDropdown(kuerzelListe) {
    const selectElement = document.getElementById('kuerzel-select');
    // Bestehende Optionen (außer der ersten) entfernen, falls nötig
    selectElement.length = 1; // Behält nur "--Bitte wählen--"

    kuerzelListe.sort(); // Kürzel alphabetisch sortieren

    kuerzelListe.forEach(kuerzel => {
        const option = document.createElement('option');
        option.value = kuerzel;
        option.textContent = kuerzel;
        selectElement.appendChild(option);
    });
    console.log("Dropdown mit Kürzeln gefüllt.");
}

// Funktion zum Anzeigen der Position des Spielers
function showPlayerPosition() {
    if (!scoreData) {
        alert("Punktestände noch nicht geladen. Bitte warten oder erneut versuchen.");
        // Optional: Hier fetchScoresAndPopulateDropdown() erneut aufrufen?
        return; 
    }

    const selectElement = document.getElementById('kuerzel-select');
    const selectedKuerzel = selectElement.value;

    if (!selectedKuerzel) {
        alert("Bitte wähle zuerst dein Kürzel aus.");
        return;
    }

    const score = scoreData[selectedKuerzel];
    console.log(`Position für ${selectedKuerzel} gesucht. Score: ${score}`);

    // Alle bisherigen Hervorhebungen entfernen
    const alleFelder = document.querySelectorAll('.spielbrett-feld');
    alleFelder.forEach(f => f.classList.remove('active-player'));

    // Das richtige Feld finden und hervorheben
    let targetFieldId;
    if (typeof score === 'number' && score >= 1 && score <= 100) {
        targetFieldId = score;
    } else {
        // Wenn Score 0, negativ oder ungültig ist -> Startfeld
        targetFieldId = 'start'; 
    }

    const targetField = document.querySelector(`.spielbrett-feld[data-field-id="${targetFieldId}"]`);

    if (targetField) {
        targetField.classList.add('active-player');
        console.log(`Feld ${targetFieldId} für ${selectedKuerzel} hervorgehoben.`);
        // Optional: Zum Feld scrollen?
        // targetField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        console.warn(`Konnte Feld mit ID ${targetFieldId} nicht finden.`);
    }
}

// Event Listener hinzufügen, wenn das HTML geladen ist
document.addEventListener('DOMContentLoaded', async function() { // Mache diese Funktion async
    generateBoard(); // Spielbrett beim Laden generieren

    // Scores holen und warten, bis sie da sind und Dropdown gefüllt ist
    await fetchScoresAndPopulateDropdown(); 

    // --- NEU: URL Parameter auslesen ---
    const urlParams = new URLSearchParams(window.location.search);
    const playerKuerzelFromUrl = urlParams.get('player');

    if (playerKuerzelFromUrl && scoreData && scoreData[playerKuerzelFromUrl] !== undefined) {
         const selectElement = document.getElementById('kuerzel-select');
         selectElement.value = playerKuerzelFromUrl; // Kürzel im Dropdown auswählen
         showPlayerPosition(); // Position direkt anzeigen
         console.log(`Kürzel ${playerKuerzelFromUrl} aus URL Parameter ausgewählt.`);
    }
    // --- Ende URL Parameter auslesen ---

    // --- NEU: Event Listener für das Dropdown-Menü (Select) hinzufügen ---
const selectElement = document.getElementById('kuerzel-select');
if (selectElement) {
    // Rufe showPlayerPosition auf, wenn sich die Auswahl ändert
    selectElement.addEventListener('change', showPlayerPosition); 
}

// --- Listener für den Refresh-Button ---
const refreshButton = document.getElementById('refresh-data-btn');
if (refreshButton) {
    refreshButton.addEventListener('click', async () => { // Async Funktion für await
        console.log("Aktualisiere Daten...");
        refreshButton.textContent = "Lade..."; // Feedback für User
        refreshButton.disabled = true;

        // NEU: Merke dir das aktuell ausgewählte Kürzel *vor* dem Refresh
        const selectElement = document.getElementById('kuerzel-select');
        const previouslySelectedKuerzel = selectElement.value; 

        // Daten neu holen & Dropdown aktualisieren
        await fetchScoresAndPopulateDropdown(); 

        // NEU: Versuche, das vorherige Kürzel wieder auszuwählen
        if (previouslySelectedKuerzel && selectElement.querySelector(`option[value="${previouslySelectedKuerzel}"]`)) {
            // Prüft, ob das Kürzel nach dem Refresh noch existiert
             selectElement.value = previouslySelectedKuerzel; 
             console.log(`Kürzel ${previouslySelectedKuerzel} nach Refresh wieder ausgewählt.`);
        } else {
             console.log("Vorheriges Kürzel nach Refresh nicht mehr vorhanden oder keins ausgewählt.");
             // Optional: Hier könnte man die alte Hervorhebung entfernen, falls gewünscht
             // const alleFelder = document.querySelectorAll('.spielbrett-feld');
             // alleFelder.forEach(f => f.classList.remove('active-player'));
        }

        // Anzeige für das (jetzt hoffentlich wieder) ausgewählte Kürzel aktualisieren
        // Diese Funktion liest den dann aktuellen Wert aus dem Select aus
        showPlayerPosition(); 

        refreshButton.textContent = "Daten aktualisieren"; // Text zurücksetzen
        refreshButton.disabled = false;
        console.log("Daten aktualisiert.");
    });
}
// --- Ende des neuen Listeners für den Refresh-Button ---

    // --- NEU: Event Listener für den "Link kopieren"-Button ---
    const copyButton = document.getElementById('copy-link-btn');
    if(copyButton) { // Prüfen ob Button existiert
        copyButton.addEventListener('click', function() {
            const selectElement = document.getElementById('kuerzel-select');
            const selectedKuerzel = selectElement.value;

            if (!selectedKuerzel) {
                alert("Bitte wähle zuerst dein Kürzel aus, um einen Link zu kopieren.");
                return;
            }

            // Basis-URL ohne Parameter oder Hash
            const baseUrl = window.location.origin + window.location.pathname; 
            const personalUrl = `${baseUrl}?player=${selectedKuerzel}`;

            // In die Zwischenablage kopieren (moderne Methode)
            navigator.clipboard.writeText(personalUrl).then(function() {
                console.log('Link erfolgreich kopiert:', personalUrl);
                // Feedback für den User
                copyButton.textContent = 'Kopiert!'; 
                copyButton.disabled = true; // Button kurz deaktivieren
                setTimeout(() => {
                   copyButton.textContent = 'Persönlichen Link kopieren'; 
                   copyButton.disabled = false;
                }, 2000); // Nach 2 Sekunden zurücksetzen
            }).catch(function(err) {
                console.error('Fehler beim Kopieren des Links: ', err);
                alert('Konnte den Link leider nicht kopieren.');
            });
        });
    }
    // --- Ende Event Listener für "Link kopieren"-Button ---

}); // Ende von DOMContentLoaded