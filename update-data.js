// Script per elaborare i dati - VERSIONE SEMPLIFICATA
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

        visits.forEach(visit => {
            // CERCA IL NOME
            const playerName = visit.Nome || visit['Nome'] || 'Sconosciuto';

            if (!playerName || playerName === 'Sconosciuto') {
                console.warn('Visita senza nome:', visit);
                return; // Salta questa visita
            }

            // CERCA EMAIL
            const playerEmail = visit['Indirizzo email'] || visit.email || '';

            // Inizializza giocatore se non esiste
            if (!playerMap.has(playerName)) {
                playerMap.set(playerName, {
                    name: playerName,
                    email: playerEmail,
                    total: 0,
                    locations: new Set()
                });
            } else {
                // Se il giocatore esiste già e ha un'email vuota, aggiornala se ne trovi una
                const existingPlayer = playerMap.get(playerName);
                if ((!existingPlayer.email || existingPlayer.email === '') && playerEmail) {
                    existingPlayer.email = playerEmail;
                }
            }

            const player = playerMap.get(playerName);

            // Incrementa conteggio visite
            player.total++;

            // CERCA LUOGO
            const luogo = visit.Luogo || visit['Luogo'] || '';
            if (luogo && luogo.trim()) {
                player.locations.add(luogo.trim());
            }
        });

        console.log(`👥 Trovati ${playerMap.size} giocatori unici`);

        if (playerMap.size === 0) {
            console.warn('⚠️ Nessun giocatore trovato! Controlla il formato dei dati.');
        }

        // Calcola statistiche per ogni giocatore (VERSIONE SEMPLIFICATA)
        const players = Array.from(playerMap.values()).map(player => {
            return {
                name: player.name,
                email: player.email || '',
                total: player.total,
                level: calculateLevel(player.total),
                topLocations: Array.from(player.locations).slice(0, 3),
                avatar: getAvatarUrl(player.name)
                // RIMOSSI: notesCount, uniqueLocations, averageMonthly, favoriteTime, firstVisit, lastVisit
            };
        });

        // Ordina per visite (discendente)
        players.sort((a, b) => b.total - a.total);

        // Statistiche globali (solo quelle usate)
        const stats = {
            totalVisits: visits.length,
            totalPlayers: players.length,
            topPlayer: players[0]?.name || 'N/A',
            playersWithEmail: players.filter(p => p.email && p.email.trim() !== '').length,
            lastUpdate: new Date().toISOString()
        };

        // Crea output
        const output = {
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                visits: visits, // Mantieni tutte le visite originali
                players: players, // Solo i campi necessari
                stats: stats
            }
        };

        // Salva file
        fs.writeFileSync(CONFIG.outputFile, JSON.stringify(output, null, 2));

        console.log(`\n✅ Dati elaborati con successo!`);
        console.log(`📊 Visite: ${stats.totalVisits}`);
        console.log(`👥 Giocatori: ${stats.totalPlayers}`);
        console.log(`📧 Giocatori con email: ${stats.playersWithEmail}`);
        console.log(`🏆 Top: ${stats.topPlayer}`);
        console.log(`💾 Salvato in: ${CONFIG.outputFile}`);

        // Mostra anteprima classifica
        console.log('\n🏁 CLASSIFICA:');
        players.forEach((player, index) => {
            const rankIcon = index === 0 ? '👑' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : '📊'));
            console.log(`${rankIcon} ${index + 1}. ${player.name}: ${player.total} visite`);
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

// Funzione per calcolare il livello (mantenuta perché usata)
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
                color: LEVELS[i].color
            };
        }
    }
    return { number: 1, name: 'Principiante', color: '#808080' };
}

// Funzione per ottenere avatar (mantenuta perché usata)
function getAvatarUrl(playerName) {
    // Mappa nomi a file immagine
    const avatarMap = {
        'Max': 'max.jpg',
        'Easy': 'easy.jpg',
        'Ale': 'ale.jpg',
        'Kej': 'kej.jpg',
        'Zani': 'zani.jpg',
        'Marco': 'marco.jpg',
        'Fabio': 'fabio.jpg',
        'Giova': 'giova.jpg'
    };

    const fileName = avatarMap[playerName] || 'default.jpg';
    return `assets/avatars/${fileName}`;
}

// Esegui
if (require.main === module) {
    console.log('🍔 McRanking Data Processor 🍟');
    console.log('📦 Versione semplificata\n');
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