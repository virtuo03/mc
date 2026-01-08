// Script per elaborare i dati dal Google Sheets scaricato
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
        
        // Raggruppa per giocatore
        const playerMap = new Map();
        
        visits.forEach(visit => {
            const playerName = visit.Nome || visit.name;
            if (!playerName) return;
            
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
            player.visits.push(visit);
            player.total++;
            player.dates.push(visit.Data || visit.date);
            
            if (visit.Orario || visit.time) {
                player.times.push(visit.Orario || visit.time);
            }
            
            if (visit.Luogo || visit.location) {
                player.locations.add(visit.Luogo || visit.location);
            }
            
            if (visit.Note || visit.notes) {
                player.notes.push(visit.Note || visit.notes);
            }
        });
        
        // Calcola statistiche
        const players = Array.from(playerMap.values()).map(player => {
            // Calcola streak
            const streak = calculateStreak(player.dates);
            
            // Calcola livello (semplice)
            let level = 1;
            if (player.total >= 50) level = 5;
            else if (player.total >= 30) level = 4;
            else if (player.total >= 15) level = 3;
            else if (player.total >= 5) level = 2;
            
            // Date formattate
            const sortedDates = [...new Set(player.dates)]
                .filter(date => date)
                .sort();
            
            const firstVisit = sortedDates[0];
            const lastVisit = sortedDates[sortedDates.length - 1];
            
            // Luoghi più frequenti
            const topLocations = Array.from(player.locations)
                .filter(loc => loc && loc.trim())
                .slice(0, 3);
            
            return {
                name: player.name,
                total: player.total,
                streak,
                level,
                firstVisit,
                lastVisit,
                topLocations,
                locationsCount: player.locations.size,
                notesCount: player.notes.filter(note => note && note.trim()).length,
                monthlyAverage: calculateMonthlyAverage(player.dates),
                favoriteTime: calculateFavoriteTime(player.times)
            };
        });
        
        // Ordina per visite
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
        
        console.log(`✅ Dati elaborati con successo!`);
        console.log(`📊 Visite: ${stats.totalVisits}`);
        console.log(`👥 Giocatori: ${stats.totalPlayers}`);
        console.log(`🏆 Top: ${stats.topPlayer}`);
        console.log(`💾 Salvato in: ${CONFIG.outputFile}`);
        
    } catch (error) {
        console.error('❌ Errore:', error.message);
        process.exit(1);
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
        const hour = parseInt(time.split(':')[0]);
        if (hour >= 6 && hour < 12) timeCategories['Mattina']++;
        else if (hour >= 12 && hour < 15) timeCategories['Pranzo']++;
        else if (hour >= 15 && hour < 19) timeCategories['Pomeriggio']++;
        else if (hour >= 19 && hour < 23) timeCategories['Sera']++;
        else timeCategories['Notte']++;
    });
    
    return Object.entries(timeCategories)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0];
}

// Esegui
if (require.main === module) {
    processData();
}

module.exports = { processData };