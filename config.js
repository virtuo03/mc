// Configurazione McRanking - Versione JSON
const CONFIG = {
    // Percorsi dei file JSON (ospitati su GitHub)
    DATA_URLS: {
        VISITS: './data/visits.json',
        PLAYERS: './data/players.json'
    },

    // Avatars
    AVATARS_PATH: 'assets/avatars/',
    DEFAULT_AVATAR: 'default.jpg',

    // Costo medio per visita
    AVERAGE_COST_PER_VISIT: 10,

    // Badge
    BADGES: {
        VETERAN: { name: 'Veterano', threshold: 30, color: '#FFD700' },
        REGULAR: { name: 'Regolare', threshold: 15, color: '#C0C0C0' },
        STREAKER: { name: 'In Serie', threshold: 3, color: '#FF6B6B' },
        EARLY_BIRD: { name: 'Mattiniero', threshold: 10, color: '#4ECDC4' },
        NIGHT_OWL: { name: 'Nottambulo', threshold: 10, color: '#45B7D1' },
        CHAMPION: { name: 'Campione', threshold: 50, color: '#FF0000' }
    },

    // Livelli
    LEVELS: [
        { min: 0, max: 5, name: 'Principiante', color: '#808080' },
        { min: 6, max: 15, name: 'Appassionato', color: '#4CAF50' },
        { min: 16, max: 30, name: 'Esperto', color: '#2196F3' },
        { min: 31, max: 50, name: 'Maestro', color: '#9C27B0' },
        { min: 51, max: 100, name: 'Leggenda', color: '#FF9800' },
        { min: 101, max: 999, name: 'McDio', color: '#FF0000' }
    ],

    // Filtri di default
    DEFAULT_FILTERS: {
        timeRange: 'all', // all, month, week, today
        sortBy: 'visits' // visits, streak, lastVisit
    }
};

// Funzione per caricare dati JSON
async function loadJSON(url) {
    try {
        // Aggiungi timestamp per evitare cache
        const cacheBuster = `?t=${Date.now()}`;
        const response = await fetch(url + cacheBuster);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Errore nel caricamento di ${url}:`, error);
        return null;
    }
}

// Esporta per Node.js (se serve)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, loadJSON };
}