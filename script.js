// McRanking App - Versione JSON
class McRankingJSONApp {
    constructor() {
        this.visits = [];
        this.players = [];
        this.stats = {};
        this.charts = {};
        this.currentFilter = 'all';
        this.isLoading = true;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Inizializzazione McRanking (JSON)...');
        
        try {
            // Carica dati dai file JSON
            await this.loadData();
            
            // Inizializza app
            this.calculateStats();
            this.renderAll();
            this.initCharts();
            this.setupEventListeners();
            
            this.isLoading = false;
            console.log('✅ App inizializzata!');
            
        } catch (error) {
            console.error('❌ Errore critico:', error);
            this.showError('Impossibile caricare i dati. Controlla la connessione.');
        }
    }
    
    async loadData() {
        // Prova a caricare i dati elaborati prima
        const playersData = await loadJSON(CONFIG.DATA_URLS.PLAYERS);
        
        if (playersData && playersData.success) {
            console.log('📊 Usando dati pre-elaborati');
            this.players = playersData.data.players;
            this.visits = playersData.data.visits;
            this.stats = playersData.data.stats;
        } else {
            // Fallback: elabora dati grezzi
            console.log('🔄 Elaborazione dati da zero...');
            const visitsData = await loadJSON(CONFIG.DATA_URLS.VISITS);
            
            if (!visitsData) {
                throw new Error('Nessun dato disponibile');
            }
            
            this.visits = visitsData;
            this.processVisits();
        }
    }
    
    processVisits() {
        // Raggruppa visite per giocatore
        const playerMap = new Map();
        
        this.visits.forEach(visit => {
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
        
        // Calcola statistiche per ogni giocatore
        this.players = Array.from(playerMap.values()).map(player => {
            // Calcola streak
            const streak = this.calculateStreak(player.dates);
            
            // Calcola livello
            const level = this.calculateLevel(player.total);
            
            // Badge
            const badges = this.calculateBadges(player);
            
            // Date formattate
            const sortedDates = [...new Set(player.dates)]
                .filter(date => date)
                .sort()
                .map(date => new Date(date));
            
            const firstVisit = sortedDates[0];
            const lastVisit = sortedDates[sortedDates.length - 1];
            
            // Luoghi più frequenti
            const topLocations = Array.from(player.locations)
                .filter(loc => loc && loc.trim())
                .slice(0, 3);
            
            return {
                ...player,
                streak,
                level,
                badges,
                firstVisit: firstVisit || null,
                lastVisit: lastVisit || null,
                topLocations,
                locationsCount: player.locations.size,
                avatar: this.getAvatarUrl(player.name),
                // Statistiche aggiuntive
                monthlyAverage: this.calculateMonthlyAverage(player.dates),
                favoriteTime: this.calculateFavoriteTime(player.times),
                notesCount: player.notes.filter(note => note && note.trim()).length
            };
        });
        
        // Ordina per visite (discendente)
        this.players.sort((a, b) => b.total - a.total);
        
        // Calcola statistiche globali
        this.calculateGlobalStats();
    }
    
    calculateStreak(dates) {
        if (!dates || dates.length === 0) return 0;
        
        const uniqueDates = [...new Set(dates)]
            .filter(date => date)
            .map(date => new Date(date))
            .sort((a, b) => b - a); // Decrescente
        
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
    
    calculateLevel(totalVisits) {
        for (let i = CONFIG.LEVELS.length - 1; i >= 0; i--) {
            if (totalVisits >= CONFIG.LEVELS[i].min) {
                return {
                    number: i + 1,
                    name: CONFIG.LEVELS[i].name,
                    color: CONFIG.LEVELS[i].color,
                    min: CONFIG.LEVELS[i].min,
                    max: CONFIG.LEVELS[i].max
                };
            }
        }
        return { number: 1, name: 'Principiante', color: '#808080' };
    }
    
    calculateBadges(player) {
        const badges = [];
        
        // Veterano (>30 visite)
        if (player.total >= CONFIG.BADGES.VETERAN.threshold) {
            badges.push(CONFIG.BADGES.VETERAN);
        }
        
        // Regolare (>15 visite)
        if (player.total >= CONFIG.BADGES.REGULAR.threshold) {
            badges.push(CONFIG.BADGES.REGULAR);
        }
        
        // Streaker (streak > 3)
        if (player.streak >= CONFIG.BADGES.STREAKER.threshold) {
            badges.push(CONFIG.BADGES.STREAKER);
        }
        
        // Early Bird (visite prima delle 11)
        const earlyVisits = player.times.filter(time => {
            const hour = parseInt(time.split(':')[0]);
            return hour < 11 && hour >= 6;
        });
        if (earlyVisits.length >= CONFIG.BADGES.EARLY_BIRD.threshold) {
            badges.push(CONFIG.BADGES.EARLY_BIRD);
        }
        
        // Night Owl (visite dopo le 20)
        const nightVisits = player.times.filter(time => {
            const hour = parseInt(time.split(':')[0]);
            return hour >= 20 || hour < 6;
        });
        if (nightVisits.length >= CONFIG.BADGES.NIGHT_OWL.threshold) {
            badges.push(CONFIG.BADGES.NIGHT_OWL);
        }
        
        // Campione (>50 visite)
        if (player.total >= 50) {
            badges.push(CONFIG.BADGES.CHAMPION);
        }
        
        return badges;
    }
    
    calculateMonthlyAverage(dates) {
        if (!dates || dates.length < 2) return 0;
        
        const firstDate = new Date(Math.min(...dates.map(d => new Date(d))));
        const lastDate = new Date(Math.max(...dates.map(d => new Date(d))));
        
        const monthDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 
                        + (lastDate.getMonth() - firstDate.getMonth()) 
                        + 1;
        
        return monthDiff > 0 ? (dates.length / monthDiff).toFixed(1) : dates.length;
    }
    
    calculateFavoriteTime(times) {
        if (!times || times.length === 0) return 'N/A';
        
        const timeCategories = {
            'Mattina (6-11)': 0,
            'Pranzo (12-14)': 0,
            'Pomeriggio (15-18)': 0,
            'Sera (19-22)': 0,
            'Notte (23-5)': 0
        };
        
        times.forEach(time => {
            const hour = parseInt(time.split(':')[0]);
            if (hour >= 6 && hour < 12) timeCategories['Mattina (6-11)']++;
            else if (hour >= 12 && hour < 15) timeCategories['Pranzo (12-14)']++;
            else if (hour >= 15 && hour < 19) timeCategories['Pomeriggio (15-18)']++;
            else if (hour >= 19 && hour < 23) timeCategories['Sera (19-22)']++;
            else timeCategories['Notte (23-5)']++;
        });
        
        return Object.entries(timeCategories)
            .reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }
    
    calculateGlobalStats() {
        const totalVisits = this.visits.length;
        const totalPlayers = this.players.length;
        
        // Visite questo mese
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const monthlyVisits = this.visits.filter(visit => {
            const visitDate = new Date(visit.Data || visit.date);
            return visitDate.getMonth() === currentMonth && 
                   visitDate.getFullYear() === currentYear;
        }).length;
        
        // Spesa totale stimata
        const totalSpent = totalVisits * CONFIG.AVERAGE_COST_PER_VISIT;
        
        // Record settimanale
        const weeklyRecord = this.calculateWeeklyRecord();
        
        // Luogo più popolare
        const locations = this.visits
            .map(v => v.Luogo || v.location)
            .filter(loc => loc && loc.trim());
        
        const locationCounts = locations.reduce((acc, loc) => {
            acc[loc] = (acc[loc] || 0) + 1;
            return acc;
        }, {});
        
        const topLocation = Object.entries(locationCounts)
            .sort((a, b) => b[1] - a[1])[0];
        
        this.stats = {
            totalVisits,
            totalPlayers,
            monthlyVisits,
            totalSpent,
            weeklyRecord,
            topLocation: topLocation ? `${topLocation[0]} (${topLocation[1]}x)` : 'N/A',
            averagePerPlayer: totalPlayers > 0 ? (totalVisits / totalPlayers).toFixed(1) : 0,
            startDate: this.players.reduce((min, p) => {
                const first = p.firstVisit;
                return (!min || (first && first < min)) ? first : min;
            }, null)
        };
    }
    
    calculateWeeklyRecord() {
        if (this.visits.length === 0) return 0;
        
        const visitsByWeek = new Map();
        
        this.visits.forEach(visit => {
            const date = new Date(visit.Data || visit.date);
            const year = date.getFullYear();
            const week = this.getWeekNumber(date);
            const key = `${year}-W${week.toString().padStart(2, '0')}`;
            
            visitsByWeek.set(key, (visitsByWeek.get(key) || 0) + 1);
        });
        
        return Math.max(...visitsByWeek.values());
    }
    
    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
    
    getAvatarUrl(playerName) {
        // Mappa nomi a file immagine
        const avatarMap = {
            'Mario': 'mario.jpg',
            'Luigi': 'luigi.jpg',
            'Paolo': 'paolo.jpg',
            'Giulia': 'giulia.jpg',
            'Anna': 'anna.jpg'
            // Aggiungi altri giocatori
        };
        
        const fileName = avatarMap[playerName] || CONFIG.DEFAULT_AVATAR;
        return `${CONFIG.AVATARS_PATH}${fileName}`;
    }
    
    renderAll() {
        this.updateHeaderStats();
        this.renderPodium();
        this.renderPlayerCards();
        this.renderRecentVisits();
        this.updateFunStats();
    }
    
    updateHeaderStats() {
        document.getElementById('total-visits').textContent = 
            this.stats.totalVisits || 0;
        document.getElementById('total-players').textContent = 
            this.stats.totalPlayers || 0;
        document.getElementById('current-month').textContent = 
            this.stats.monthlyVisits || 0;
    }
    
    renderPodium() {
        const podium = document.getElementById('podium');
        if (!podium) return;
        
        podium.innerHTML = '';
        
        const top3 = this.players.slice(0, 3);
        
        // Ordine podio: 2° - 1° - 3°
        const podiumData = [
            { player: top3[1], place: 2, class: 'second' },
            { player: top3[0], place: 1, class: 'first' },
            { player: top3[2], place: 3, class: 'third' }
        ];
        
        podiumData.forEach(({ player, place, class: className }) => {
            if (!player) return;
            
            const podiumPlace = document.createElement('div');
            podiumPlace.className = `podium-place ${className}`;
            podiumPlace.innerHTML = `
                <div class="podium-rank">#${place}</div>
                <img src="${player.avatar}" alt="${player.name}" 
                     class="podium-avatar"
                     onerror="this.onerror=null; this.src='${CONFIG.AVATARS_PATH}${CONFIG.DEFAULT_AVATAR}'">
                <h3 class="podium-name">${player.name}</h3>
                <div class="podium-score">${player.total} visite</div>
                <div class="podium-subtitle">${player.level.name}</div>
            `;
            
            podium.appendChild(podiumPlace);
        });
    }
    
    renderPlayerCards() {
        const container = document.getElementById('players-grid');
        const template = document.getElementById('player-card-template');
        
        if (!container || !template) return;
        
        container.innerHTML = '';
        
        this.players.forEach((player, index) => {
            const card = template.content.cloneNode(true);
            
            // Rank
            card.querySelector('.player-rank').textContent = `#${index + 1}`;
            card.querySelector('.player-rank').style.backgroundColor = player.level.color;
            
            // Avatar
            const avatar = card.querySelector('.player-avatar');
            avatar.src = player.avatar;
            avatar.alt = player.name;
            avatar.onerror = function() {
                this.src = `${CONFIG.AVATARS_PATH}${CONFIG.DEFAULT_AVATAR}`;
            };
            
            // Level
            const levelBadge = card.querySelector('.player-level');
            levelBadge.textContent = player.level.number;
            levelBadge.title = player.level.name;
            levelBadge.style.backgroundColor = player.level.color;
            
            // Name
            card.querySelector('.player-name').textContent = player.name;
            
            // Stats
            card.querySelector('.visits-count').textContent = player.total;
            card.querySelector('.mc-ratio').textContent = 
                `${((player.total / this.stats.totalVisits) * 100 || 0).toFixed(1)}%`;
            card.querySelector('.streak').textContent = player.streak;
            
            // Dates
            const lastVisitSpan = card.querySelector('.last-visit span');
            const firstVisitSpan = card.querySelector('.first-visit span');
            
            lastVisitSpan.textContent = player.lastVisit ? 
                this.formatDate(player.lastVisit, true) : 'N/A';
            firstVisitSpan.textContent = player.firstVisit ? 
                this.formatDate(player.firstVisit) : 'N/A';
            
            // Badges
            const badgesContainer = card.querySelector('.player-badges');
            player.badges.forEach(badge => {
                const badgeEl = document.createElement('span');
                badgeEl.className = 'badge';
                badgeEl.textContent = badge.name;
                badgeEl.style.backgroundColor = badge.color;
                badgesContainer.appendChild(badgeEl);
            });
            
            container.appendChild(card);
        });
    }
    
    renderRecentVisits() {
        const container = document.getElementById('visits-list');
        const template = document.getElementById('visit-item-template');
        
        if (!container || !template) return;
        
        container.innerHTML = '';
        
        // Ordina visite recenti
        const recentVisits = [...this.visits]
            .filter(v => v.Data || v.date)
            .sort((a, b) => {
                const dateA = new Date(a.Data || a.date);
                const dateB = new Date(b.Data || b.date);
                return dateB - dateA;
            })
            .slice(0, 10);
        
        if (recentVisits.length === 0) {
            container.innerHTML = '<p class="no-visits">Nessuna visita registrata</p>';
            return;
        }
        
        recentVisits.forEach(visit => {
            const item = template.content.cloneNode(true);
            const playerName = visit.Nome || visit.name;
            
            // Avatar
            const avatar = item.querySelector('.visit-avatar img');
            avatar.src = this.getAvatarUrl(playerName);
            avatar.alt = playerName;
            avatar.onerror = function() {
                this.src = `${CONFIG.AVATARS_PATH}${CONFIG.DEFAULT_AVATAR}`;
            };
            
            // Name
            item.querySelector('.visit-person').textContent = playerName;
            
            // Time and location
            const visitDate = new Date(visit.Data || visit.date);
            const timeStr = visit.Orario || visit.time ? ` alle ${visit.Orario || visit.time}` : '';
            const locationStr = visit.Luogo || visit.location ? ` - ${visit.Luogo || visit.location}` : '';
            
            item.querySelector('.visit-time').textContent = 
                `${this.formatDate(visitDate, true)}${timeStr}${locationStr}`;
            
            // Notes
            const notes = visit.Note || visit.notes;
            if (notes && notes.trim()) {
                item.querySelector('.visit-notes').textContent = notes;
            } else {
                item.querySelector('.visit-notes').style.display = 'none';
            }
            
            container.appendChild(item);
        });
    }
    
    updateFunStats() {
        // Re del Mc
        const king = this.players[0];
        document.getElementById('king-name').textContent = king ? king.name : '-';
        
        // Record settimanale
        document.getElementById('weekly-record').textContent = 
            `${this.stats.weeklyRecord || 0} visite`;
        
        // Spesa stimata
        document.getElementById('total-spent').textContent = 
            `€${(this.stats.totalSpent || 0).toLocaleString('it-IT')}`;
        
        // Ultima visita
        if (this.visits.length > 0) {
            const lastVisit = [...this.visits]
                .filter(v => v.Data || v.date)
                .sort((a, b) => {
                    const dateA = new Date(a.Data || a.date);
                    const dateB = new Date(b.Data || b.date);
                    return dateB - dateA;
                })[0];
            
            if (lastVisit) {
                const lastDate = new Date(lastVisit.Data || lastVisit.date);
                const daysAgo = this.daysSince(lastDate);
                const playerName = lastVisit.Nome || lastVisit.name;
                
                document.getElementById('last-visit').textContent = 
                    `${daysAgo} giorni fa (${playerName})`;
            }
        }
    }
    
    initCharts() {
        this.createMonthlyChart();
        this.createTimeChart();
        this.createDistributionChart();
    }
    
    createMonthlyChart() {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;
        
        // Calcola visite per mese
        const monthlyData = {};
        this.visits.forEach(visit => {
            const date = new Date(visit.Data || visit.date);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
            monthlyData[monthYear] = (monthlyData[monthYear] || 0) + 1;
        });
        
        const labels = Object.keys(monthlyData).slice(-6);
        const data = labels.map(label => monthlyData[label]);
        
        this.charts.monthly = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Visite',
                    data: data,
                    borderColor: '#FFC72C',
                    backgroundColor: 'rgba(255, 199, 44, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }
    
    createTimeChart() {
        const ctx = document.getElementById('timeChart');
        if (!ctx) return;
        
        const timeCategories = {
            'Mattina (6-11)': 0,
            'Pranzo (12-14)': 0,
            'Pomeriggio (15-18)': 0,
            'Sera (19-22)': 0,
            'Notte (23-5)': 0
        };
        
        this.visits.forEach(visit => {
            const time = visit.Orario || visit.time;
            if (time) {
                const hour = parseInt(time.split(':')[0]);
                if (hour >= 6 && hour < 12) timeCategories['Mattina (6-11)']++;
                else if (hour >= 12 && hour < 15) timeCategories['Pranzo (12-14)']++;
                else if (hour >= 15 && hour < 19) timeCategories['Pomeriggio (15-18)']++;
                else if (hour >= 19 && hour < 23) timeCategories['Sera (19-22)']++;
                else timeCategories['Notte (23-5)']++;
            }
        });
        
        this.charts.time = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(timeCategories),
                datasets: [{
                    data: Object.values(timeCategories),
                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
    
    createDistributionChart() {
        const ctx = document.getElementById('distributionChart');
        if (!ctx) return;
        
        const topPlayers = this.players.slice(0, Math.min(5, this.players.length));
        const labels = topPlayers.map(p => p.name);
        const data = topPlayers.map(p => p.total);
        
        this.charts.distribution = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Visite',
                    data: data,
                    backgroundColor: '#DA291C',
                    borderColor: '#27251F',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }
    
    setupEventListeners() {
        // Filtri
        document.querySelectorAll('.btn-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-filter').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.applyFilter();
            });
        });
        
        // Select time range
        const timeRangeSelect = document.getElementById('time-range');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.applyFilter();
            });
        }
        
        // Pulsante refresh
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }
        
        // Auto-refresh ogni 10 minuti
        setInterval(() => this.refreshData(), 10 * 60 * 1000);
    }
    
    applyFilter() {
        // Implementa logica di filtro se necessario
        console.log(`Applicato filtro: ${this.currentFilter}`);
        // Puoi implementare filtri più avanzati qui
    }
    
    async refreshData() {
        console.log('🔄 Aggiornamento dati...');
        this.showToast('Aggiornamento dati in corso...', 'info');
        
        try {
            await this.loadData();
            this.calculateStats();
            this.renderAll();
            
            this.showToast('Dati aggiornati con successo!', 'success');
        } catch (error) {
            console.error('Errore aggiornamento:', error);
            this.showToast('Errore nell\'aggiornamento', 'error');
        }
    }
    
    // Utility functions
    formatDate(date, short = false) {
        if (!date) return 'N/A';
        
        const d = new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now - d);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (short) {
            if (diffDays === 0) return 'Oggi';
            if (diffDays === 1) return 'Ieri';
            if (diffDays < 7) return `${diffDays} giorni fa`;
        }
        
        return d.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    daysSince(date) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    
    showToast(message, type = 'info') {
        // Implementa un semplice toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            border-radius: 4px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
    
    showError(message) {
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">🍟</div>
                    <h2>Ops! Qualcosa è andato storto</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Riprova
                    </button>
                    <p class="error-hint">
                        Controlla che i file JSON siano presenti nella cartella /data/
                    </p>
                </div>
            `;
        }
    }
}

// Inizializza l'app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aggiungi stili per errori e toast
    const style = document.createElement('style');
    style.textContent = `
        .error-container {
            text-align: center;
            padding: 50px 20px;
            max-width: 500px;
            margin: 100px auto;
        }
        
        .error-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        
        .error-hint {
            margin-top: 20px;
            font-size: 0.9rem;
            color: #666;
        }
        
        .no-visits {
            text-align: center;
            padding: 40px;
            color: #666;
            font-style: italic;
        }
        
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            color: white;
            border-radius: 4px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        }
        
        .toast-success { background: #4CAF50; }
        .toast-error { background: #f44336; }
        .toast-info { background: #2196F3; }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .podium-subtitle {
            font-size: 0.8rem;
            opacity: 0.8;
            margin-top: 5px;
        }
    `;
    document.head.appendChild(style);
    
    // Avvia l'app
    window.app = new McRankingJSONApp();
});