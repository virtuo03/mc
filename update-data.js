// Script per elaborare i dati - VERSIONE COMPLETA E FUNZIONANTE
const fs = require('fs');
const path = require('path');

// Configurazione
const CONFIG = {
    inputFile: path.join(__dirname, 'data', 'visits.json'),
    outputFile: path.join(__dirname, 'data', 'players.json'),
    avatarsPath: path.join(__dirname, 'assets', 'avatars'),
    defaultAvatar: 'default.jpg'
};

// Funzione per elaborare i dati
function processData() {
    console.log('🔄 Elaborazione dati...');

    try {
        // Leggi i dati grezzi
        const rawData = fs.readFileSync(CONFIG.inputFile, 'utf8');
        const visits = JSON.parse(rawData);

        if (!Array.isArray(visits)) {
            throw new Error('Formato JSON non valido: deve essere un array');
        }

        console.log(`📊 Letti ${visits.length} visite`);

        // Raggruppa per giocatore
        const playerMap = new Map();

        // ----- QUESTA È LA PARTE CHE MANCAVA NEL TUO CODICE -----
        visits.forEach(visit => {
            // CERCA IL NOME
            const playerName = visit.Nome || visit['Nome'] || 'Sconosciuto';

            if (!playerName || playerName === 'Sconosciuto') {
                console.warn('Visita senza nome:', visit);
                return; // Salta questa visita
            }

            // Inizializza giocatore se non esiste
            if (!playerMap.has(playerName)) {
                playerMap.set(playerName, {
                    name: playerName,
                    visits: [],
                    total: 0,
                    dates: [],
                    times: [],
                    locations: new Set(),
                    notes: []
                });
            }

            const player = playerMap.get(playerName);

            // Aggiungi visita
            player.visits.push(visit);
            player.total++;

            // CERCA E FORMATA LA DATA
            const rawDate = visit.data || visit['data'] || '';
            if (rawDate) {
                const formattedDate = formatItalianDate(rawDate);
                if (formattedDate) {
                    player.dates.push(formattedDate);
                }
            }

            // CERCA L'ORARIO DAL TIMESTAMP (se presente)
            const timestamp = visit['Informazioni cronologiche'] || '';
            if (timestamp && timestamp.includes(' ')) {
                const parts = timestamp.split(' ');
                if (parts.length > 1) {
                    // Converti 11.51.35 in 11:51
                    const timePart = parts[1].split('.').slice(0, 2).join(':');
                    player.times.push(timePart);
                }
            }

            // CERCA LUOGO
            const luogo = visit.Luogo || visit['Luogo'] || '';
            if (luogo && luogo.trim()) {
                player.locations.add(luogo.trim());
            }

            // CERCA NOTE
            const note = visit.note || visit['note'] || '';
            if (note && note.trim()) {
                player.notes.push(note.trim());
            }
        });
        // ----- FINE PARTE MANCANTE -----

        console.log(`👥 Trovati ${playerMap.size} giocatori unici`);

        if (playerMap.size === 0) {
            console.warn('⚠️ Nessun giocatore trovato! Controlla il formato dei dati.');
        }

        // Calcola statistiche per ogni giocatore
        // Calcola statistiche per ogni giocatore (Versione Semplificata)
        const players = Array.from(playerMap.values()).map(player => {
            return {
                name: player.name,
                total: player.total,
                level: calculateLevel(player.total),
                topLocations: Array.from(player.locations).slice(0, 3),
                avatar: getAvatarUrl(player.name)
            };
        });

        // Ordina per visite (discendente)
        players.sort((a, b) => b.total - a.total);

        // Statistiche globali
        const stats = {
            totalVisits: visits.length,
            totalPlayers: players.length,
            startDate: players.reduce((min, p) => {
                const first = p.firstVisit;
                return (!min || (first && first < min)) ? first : min;
            }, null),
            topPlayer: players[0]?.name || 'N/A',
            lastUpdate: new Date().toISOString()
        };

        // Crea output
        const output = {
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                visits: visits,
                players: players,
                stats: stats
            }
        };

        // Salva file
        fs.writeFileSync(CONFIG.outputFile, JSON.stringify(output, null, 2));

        console.log(`\n✅ Dati elaborati con successo!`);
        console.log(`📊 Visite: ${stats.totalVisits}`);
        console.log(`👥 Giocatori: ${stats.totalPlayers}`);
        console.log(`🏆 Top: ${stats.topPlayer}`);
        console.log(`💾 Salvato in: ${CONFIG.outputFile}`);

        // Mostra anteprima classifica
        console.log('\n🏁 CLASSIFICA:');
        players.forEach((player, index) => {
            console.log(`${index + 1}. ${player.name}: ${player.total} visite`);
        });

        // DEBUG: Mostra dati grezzi
        console.log('\n🔍 DEBUG - Prime 3 visite:');
        visits.slice(0, 3).forEach((visit, i) => {
            console.log(`${i + 1}. Nome: "${visit.Nome || visit.nome}", Data: "${visit.data || visit.Data}"`);
        });

    } catch (error) {
        console.error('\n❌ ERRORE CRITICO:', error.message);
        console.error('Stack:', error.stack);

        // Crea file di errore
        const errorOutput = {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            suggestion: 'Controlla che visits.json sia un array JSON valido'
        };

        fs.writeFileSync(CONFIG.outputFile, JSON.stringify(errorOutput, null, 2));

        process.exit(1);
    }
}

// Funzione per convertire data italiana (dd/mm/yyyy) in yyyy-mm-dd
function formatItalianDate(dateString) {
    if (!dateString) return '';

    try {
        // Rimuovi eventuali spazi
        const cleanDate = dateString.toString().trim();
        console.log(`Conversione data: "${cleanDate}"`);

        // 1. Formato dd/mm/yyyy (07/01/2026)
        if (cleanDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const [day, month, year] = cleanDate.split('/');
            const result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            console.log(`  → Convertito a: ${result}`);
            return result;
        }

        // 2. Formato dd-mm-yyyy
        if (cleanDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
            const [day, month, year] = cleanDate.split('-');
            const result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            console.log(`  → Convertito a: ${result}`);
            return result;
        }

        // 3. Formato yyyy-mm-dd (già corretto)
        if (cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
            console.log(`  → Già nel formato corretto`);
            return cleanDate;
        }

        console.warn(`  ⚠️ Formato data non riconosciuto: "${cleanDate}"`);
        return cleanDate;

    } catch (error) {
        console.warn(`  ❌ Errore conversione data "${dateString}":`, error.message);
        return dateString;
    }
}

// Funzioni helper
function calculateStreak(dates) {
    if (!dates || dates.length === 0) return 0;

    const uniqueDates = [...new Set(dates)]
        .filter(date => date)
        .map(date => new Date(date))
        .sort((a, b) => b - a);

    if (uniqueDates.length === 0) return 0;

    let streak = 1;
    let currentDate = new Date(uniqueDates[0]);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const thisDate = new Date(uniqueDates[i]);

        prevDate.setHours(0, 0, 0, 0);
        thisDate.setHours(0, 0, 0, 0);

        const diffDays = Math.round((prevDate - thisDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

function calculateLevel(totalVisits) {
    const LEVELS = [
        { min: 0, max: 5, name: 'Principiante', color: '#808080' },
        { min: 6, max: 15, name: 'Appassionato', color: '#4CAF50' },
        { min: 16, max: 30, name: 'Esperto', color: '#2196F3' },
        { min: 31, max: 50, name: 'Maestro', color: '#9C27B0' },
        { min: 51, max: 100, name: 'Leggenda', color: '#FF9800' },
        { min: 101, max: 999, name: 'McDio', color: '#FF0000' }
    ];

    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (totalVisits >= LEVELS[i].min) {
            return {
                number: i + 1,
                name: LEVELS[i].name,
                color: LEVELS[i].color,
                min: LEVELS[i].min,
                max: LEVELS[i].max
            };
        }
    }
    return { number: 1, name: 'Principiante', color: '#808080' };
}

function calculateBadges(player) {
    const BADGES = {
        VETERAN: { name: 'Veterano', threshold: 30, color: '#FFD700' },
        REGULAR: { name: 'Regolare', threshold: 15, color: '#C0C0C0' },
        STREAKER: { name: 'In Serie', threshold: 3, color: '#FF6B6B' },
        EARLY_BIRD: { name: 'Mattiniero', threshold: 10, color: '#4ECDC4' },
        NIGHT_OWL: { name: 'Nottambulo', threshold: 10, color: '#45B7D1' },
        CHAMPION: { name: 'Campione', threshold: 50, color: '#FF0000' }
    };

    const badges = [];

    // Veterano (>30 visite)
    if (player.total >= BADGES.VETERAN.threshold) {
        badges.push(BADGES.VETERAN);
    }

    // Regolare (>15 visite)
    if (player.total >= BADGES.REGULAR.threshold) {
        badges.push(BADGES.REGULAR);
    }

    // Streaker (streak > 3)
    if (player.streak >= BADGES.STREAKER.threshold) {
        badges.push(BADGES.STREAKER);
    }

    return badges;
}

function calculateMonthlyAverage(dates) {
    if (!dates || dates.length < 2) return 0;

    const validDates = dates.filter(date => date).map(date => new Date(date));
    const firstDate = new Date(Math.min(...validDates));
    const lastDate = new Date(Math.max(...validDates));

    const monthDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12
        + (lastDate.getMonth() - firstDate.getMonth())
        + 1;

    return monthDiff > 0 ? (validDates.length / monthDiff).toFixed(1) : validDates.length;
}

function calculateFavoriteTime(times) {
    if (!times || times.length === 0) return 'N/A';

    const timeCategories = {
        'Mattina': 0,
        'Pranzo': 0,
        'Pomeriggio': 0,
        'Sera': 0,
        'Notte': 0
    };

    times.forEach(time => {
        if (time && time.includes(':')) {
            const hour = parseInt(time.split(':')[0]);
            if (hour >= 6 && hour < 12) timeCategories['Mattina']++;
            else if (hour >= 12 && hour < 15) timeCategories['Pranzo']++;
            else if (hour >= 15 && hour < 19) timeCategories['Pomeriggio']++;
            else if (hour >= 19 && hour < 23) timeCategories['Sera']++;
            else timeCategories['Notte']++;
        }
    });

    const entries = Object.entries(timeCategories);
    if (entries.length === 0) return 'N/A';

    return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
}

function getAvatarUrl(playerName) {
    // Mappa nomi a file immagine
    const avatarMap = {
        'Max': 'max.jpg',
        'Easy': 'easy.jpg',
        'Ale': 'ale.jpg',
        'Kej': 'kej.jpg',
        'Zani': 'zani.jpg',
        'Marco': 'marco.jpg',
        'Fabio': 'fabio.jpg'
    };

    const fileName = avatarMap[playerName] || 'default.jpg';
    return `assets/avatars/${fileName}`;
}

// Esegui
if (require.main === module) {
    console.log('🍔 McRanking Data Processor 🍟');
    console.log('===============================\n');

    // Controlla se il file esiste
    if (!fs.existsSync(CONFIG.inputFile)) {
        console.error(`❌ File ${CONFIG.inputFile} non trovato!`);
        console.log('Crea prima data/visits.json con i tuoi dati');
        process.exit(1);
    }

    processData();
}

module.exports = { processData };