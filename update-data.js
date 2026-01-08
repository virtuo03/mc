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
    console.log('🔄 Elaborazione dati con spese...');

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

            // CERCA SPESA - gestisci diversi formati
            let spendAmount = 0;
            const spendField = visit['Quanto sei ricco?'] || visit.spend || visit.importo || '';
            
            if (spendField) {
                // Converti in numero, gestendo virgole, punti e formati vari
                const cleanAmount = String(spendField)
                    .replace(/[^\d,.-]/g, '') // Rimuovi tutto tranne numeri, virgole, punti e trattini
                    .replace(/,/g, '.');      // Sostituisci virgole con punti
                
                spendAmount = parseFloat(cleanAmount) || 0;
                
                // Se è un numero valido, arrotonda a 2 decimali
                if (!isNaN(spendAmount) && isFinite(spendAmount)) {
                    spendAmount = Math.round(spendAmount * 100) / 100;
                } else {
                    spendAmount = 0;
                }
            }

            // CERCA LUOGO
            const luogo = visit.Luogo || visit['Luogo'] || '';

            // CERCA NOTE
            const noteField = visit['note (panino e altro)'] || visit.note || visit['note'] || '';
            const note = noteField ? String(noteField).trim() : '';

            // Inizializza giocatore se non esiste
            if (!playerMap.has(playerName)) {
                playerMap.set(playerName, {
                    name: playerName,
                    email: playerEmail,
                    total: 0,
                    totalSpent: 0,
                    locations: new Set(),
                    visits: [], // Aggiungiamo array di visite dettagliate
                    notes: []   // Aggiungiamo array di note
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
            
            // Aggiungi spesa
            player.totalSpent += spendAmount;
            
            // Aggiungi luogo
            if (luogo && luogo.trim()) {
                player.locations.add(luogo.trim());
            }
            
            // Aggiungi visita dettagliata
            player.visits.push({
                date: visit.data || '',
                location: luogo || '',
                spend: spendAmount,
                note: note,
                timestamp: visit['Informazioni cronologiche'] || ''
            });
            
            // Aggiungi nota se presente
            if (note) {
                player.notes.push(note);
            }
        });

        console.log(`👥 Trovati ${playerMap.size} giocatori unici`);

        if (playerMap.size === 0) {
            console.warn('⚠️ Nessun giocatore trovato! Controlla il formato dei dati.');
        }

        // Calcola statistiche per ogni giocatore
        const players = Array.from(playerMap.values()).map(player => {
            // Calcola spesa media per visita
            const averageSpend = player.total > 0 ? 
                Math.round((player.totalSpent / player.total) * 100) / 100 : 0;
            
            // Trova visite con spesa
            const visitsWithSpend = player.visits.filter(v => v.spend > 0);
            const spendCount = visitsWithSpend.length;
            
            // Spesa massima
            const maxSpend = player.visits.length > 0 ? 
                Math.max(...player.visits.map(v => v.spend || 0)) : 0;
            
            // Ordina visite per data (più recenti prima)
            const sortedVisits = [...player.visits].sort((a, b) => {
                const dateA = parseDateString(a.date);
                const dateB = parseDateString(b.date);
                return dateB - dateA;
            });

            return {
                name: player.name,
                email: player.email || '',
                total: player.total,
                totalSpent: Math.round(player.totalSpent * 100) / 100, // Arrotonda a 2 decimali
                averageSpend: averageSpend,
                spendCount: spendCount,
                maxSpend: Math.round(maxSpend * 100) / 100,
                level: calculateLevel(player.total),
                topLocations: Array.from(player.locations).slice(0, 3),
                recentVisits: sortedVisits.slice(0, 5), // Ultime 5 visite
                notes: player.notes.slice(0, 5), // Prime 5 note
                avatar: getAvatarUrl(player.name)
            };
        });

        // Ordina per visite (discendente)
        players.sort((a, b) => b.total - a.total);

        // Calcola statistiche globali
        const totalSpent = players.reduce((sum, player) => sum + player.totalSpent, 0);
        const averageTotalSpent = players.length > 0 ? totalSpent / players.length : 0;
        
        // Trova il giocatore che ha speso di più
        const topSpender = players.reduce((max, player) => 
            player.totalSpent > max.totalSpent ? player : max, players[0] || { name: 'N/A', totalSpent: 0 }
        );
        
        // Trova la spesa media più alta
        const topAverageSpender = players.reduce((max, player) => 
            player.averageSpend > max.averageSpend ? player : max, players[0] || { name: 'N/A', averageSpend: 0 }
        );

        // Statistiche globali
        const stats = {
            totalVisits: visits.length,
            totalPlayers: players.length,
            totalSpent: Math.round(totalSpent * 100) / 100,
            averageTotalSpent: Math.round(averageTotalSpent * 100) / 100,
            topPlayer: players[0]?.name || 'N/A',
            topSpender: topSpender.name || 'N/A',
            topSpenderAmount: Math.round(topSpender.totalSpent * 100) / 100,
            topAverageSpender: topAverageSpender.name || 'N/A',
            topAverageSpend: Math.round(topAverageSpender.averageSpend * 100) / 100,
            playersWithEmail: players.filter(p => p.email && p.email.trim() !== '').length,
            visitsWithSpend: visits.filter(v => {
                const spendField = v['Quanto sei ricco?'] || '';
                const cleanAmount = String(spendField).replace(/[^\d,.-]/g, '').replace(/,/g, '.');
                return parseFloat(cleanAmount) > 0;
            }).length,
            lastUpdate: new Date().toISOString()
        };

        // Crea output
        const output = {
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                visits: visits, // Mantieni tutte le visite originali
                players: players, // Giocatori con statistiche aggiornate
                stats: stats
            }
        };

        // Salva file
        fs.writeFileSync(CONFIG.outputFile, JSON.stringify(output, null, 2));

        console.log(`\n✅ Dati elaborati con successo!`);
        console.log(`📊 Visite: ${stats.totalVisits}`);
        console.log(`💰 Spesa Totale: €${stats.totalSpent.toFixed(2)}`);
        console.log(`👥 Giocatori: ${stats.totalPlayers}`);
        console.log(`🏆 Top Visite: ${stats.topPlayer}`);
        console.log(`💸 Top Spender: ${stats.topSpender} (€${stats.topSpenderAmount.toFixed(2)})`);
        console.log(`📈 Spesa Media più alta: ${stats.topAverageSpender} (€${stats.topAverageSpend.toFixed(2)} a visita)`);
        console.log(`💾 Salvato in: ${CONFIG.outputFile}`);

        // Mostra anteprima classifica con spese
        console.log('\n🏁 CLASSIFICA CON SPESE:');
        players.forEach((player, index) => {
            const rankIcon = index === 0 ? '👑' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : '📊'));
            const spendText = player.totalSpent > 0 ? ` | €${player.totalSpent.toFixed(2)}` : '';
            console.log(`${rankIcon} ${index + 1}. ${player.name}: ${player.total} visite${spendText}`);
            
            // Mostra dettagli per i primi 3
            if (index < 3 && player.totalSpent > 0) {
                console.log(`   → Media: €${player.averageSpend.toFixed(2)} a visita`);
                if (player.maxSpend > 0) {
                    console.log(`   → Max: €${player.maxSpend.toFixed(2)}`);
                }
            }
        });

        console.log('\n💰 RIEPILOGO FINANZIARIO:');
        console.log(`   Totale speso: €${stats.totalSpent.toFixed(2)}`);
        console.log(`   Spesa media per giocatore: €${stats.averageTotalSpent.toFixed(2)}`);
        console.log(`   Visite con spesa registrata: ${stats.visitsWithSpend}/${stats.totalVisits}`);

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

// Funzione helper per parsare date
function parseDateString(dateString) {
    if (!dateString) return new Date(0); // Data molto vecchia se non specificata
    
    try {
        // Gestisci formato DD/MM/YYYY
        const parts = dateString.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Mesi da 0 a 11
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
        
        // Prova con altri formati
        return new Date(dateString);
    } catch (error) {
        return new Date(0);
    }
}

// Esegui
if (require.main === module) {
    console.log('🍔 McRanking Data Processor 🍟');
    console.log('💰 Versione con tracciamento spese\n');
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