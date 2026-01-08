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

    // Livelli
    LEVELS: [
        { min: 1, max: 3, name: '🍟 Novizio', color: '#808080' },
        { min: 4, max: 10, name: '🍔 Amante', color: '#4CAF50' },
        { min: 11, max: 20, name: '👑 Fanatico', color: '#2196F3' },
        { min: 21, max: 30, name: '🏆 Professionista', color: '#9C27B0' },
        { min: 31, max: 50, name: '💎 Mitico', color: '#FF9800' },
        { min: 67, max: 365, name: 'GOAT', color: '#FF0000' }
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