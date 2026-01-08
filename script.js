// McRanking App - Versione Semplificata e Funzionante
class McRankingJSONApp {
    constructor() {
        this.visits = [];
        this.players = [];
        this.stats = {};
        this.charts = {};
        this.currentFilter = 'all';

        this.init();
    }

    async init() {
        console.log('🚀 Inizializzazione McRanking...');

        try {
            // Carica dati
            await this.loadData();

            // Renderizza
            this.renderAll();
            this.setupEventListeners();

            console.log('✅ App inizializzata!');

        } catch (error) {
            console.error('❌ Errore:', error);
            this.showError('Impossibile caricare i dati. Usa update.bat per generare i dati.');
        }
    }

    async loadData() {
        try {
            // Prima prova a caricare players.json (dati già elaborati)
            const playersResponse = await fetch('data/players.json');

            if (playersResponse.ok) {
                const playersData = await playersResponse.json();

                if (playersData.success) {
                    console.log('📊 Usando dati pre-elaborati');
                    this.players = playersData.data.players || [];
                    this.visits = playersData.data.visits || [];
                    this.stats = playersData.data.stats || {};
                    return;
                }
            }

            // Fallback: carica visits.json e elabora
            console.log('🔄 Caricamento dati grezzi...');
            const visitsResponse = await fetch('data/visits.json');

            if (!visitsResponse.ok) {
                throw new Error('File visits.json non trovato');
            }

            const visitsData = await visitsResponse.json();

            if (!Array.isArray(visitsData)) {
                throw new Error('Formato visits.json non valido');
            }

            this.visits = visitsData;
            this.processVisits();

        } catch (error) {
            console.warn('⚠️ Usando dati di esempio:', error.message);
            this.useSampleData();
        }
    }

    processVisits() {
        if (!this.visits || !Array.isArray(this.visits)) {
            console.error('Nessuna visita disponibile');
            this.players = [];
            return;
        }

        console.log(`Elaborazione ${this.visits.length} visite...`);

        // Raggruppa visite per giocatore
        const playerMap = {};

        this.visits.forEach(visit => {
            const playerName = visit.Nome || visit.name || 'Sconosciuto';

            if (!playerMap[playerName]) {
                playerMap[playerName] = {
                    name: playerName,
                    total: 0,
                    dates: [],
                    times: [],
                    locations: [],
                    notes: []
                };
            }

            const player = playerMap[playerName];
            player.total++;

            if (visit.Data || visit.date) {
                player.dates.push(visit.Data || visit.date);
            }

            if (visit.Orario || visit.time) {
                player.times.push(visit.Orario || visit.time);
            }

            if (visit.Luogo || visit.location) {
                player.locations.push(visit.Luogo || visit.location);
            }

            if (visit.Note || visit.notes) {
                player.notes.push(visit.Note || visit.notes);
            }
        });

        // Converti in array e calcola statistiche
        this.players = Object.values(playerMap).map(player => {
            // Calcola streak semplificato
            let streak = 0;
            if (player.dates.length > 0) {
                const sortedDates = [...new Set(player.dates)].sort().reverse();
                streak = 1;
                for (let i = 1; i < sortedDates.length; i++) {
                    const prev = new Date(sortedDates[i - 1]);
                    const curr = new Date(sortedDates[i]);
                    const diff = (prev - curr) / (1000 * 60 * 60 * 24);
                    if (diff === 1) streak++;
                    else break;
                }
            }

            // Calcola livello
            const level = this.calculateLevel(player.total);

            // Date
            const sortedDates = player.dates.sort();
            const firstVisit = sortedDates[0] || null;
            const lastVisit = sortedDates[sortedDates.length - 1] || null;

            // Luoghi unici
            const uniqueLocations = [...new Set(player.locations.filter(l => l))];

            return {
                name: player.name,
                total: player.total,
                streak,
                level,
                firstVisit,
                lastVisit,
                locations: uniqueLocations,
                locationsCount: uniqueLocations.length,
                notesCount: player.notes.filter(n => n && n.trim()).length,
                avatar: this.getAvatarUrl(player.name)
            };
        });

        // Ordina per visite (discendente)
        this.players.sort((a, b) => b.total - a.total);

        // Calcola statistiche globali
        this.calculateStats();
    }

    calculateStats() {
        this.stats = {
            totalVisits: this.visits.length,
            totalPlayers: this.players.length,
            monthlyVisits: this.calculateMonthlyVisits(),
            totalSpent: this.visits.length * CONFIG.AVERAGE_COST_PER_VISIT,
            weeklyRecord: this.calculateWeeklyRecord(),
            startDate: this.players.reduce((min, p) => {
                if (!p.firstVisit) return min;
                const date = new Date(p.firstVisit);
                return (!min || date < min) ? date : min;
            }, null)
        };
    }

    calculateMonthlyVisits() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return this.visits.filter(visit => {
            const visitDate = new Date(visit.Data || visit.date);
            return visitDate.getMonth() === currentMonth &&
                visitDate.getFullYear() === currentYear;
        }).length;
    }

    calculateWeeklyRecord() {
        if (this.visits.length === 0) return 0;

        const visitsByWeek = {};

        this.visits.forEach(visit => {
            const date = new Date(visit.Data || visit.date);
            const week = this.getWeekNumber(date);
            const key = `${date.getFullYear()}-W${week}`;

            visitsByWeek[key] = (visitsByWeek[key] || 0) + 1;
        });

        return Math.max(...Object.values(visitsByWeek));
    }

    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    calculateLevel(totalVisits) {
        for (let i = CONFIG.LEVELS.length - 1; i >= 0; i--) {
            if (totalVisits >= CONFIG.LEVELS[i].min) {
                return {
                    number: i + 1,
                    name: CONFIG.LEVELS[i].name,
                    color: CONFIG.LEVELS[i].color
                };
            }
        }
        return { number: 1, name: 'Principiante', color: '#808080' };
    }

    getAvatarUrl(playerName) {
        const avatarMap = {
            'Mario Rossi': 'mario.jpg',
            'Luigi Bianchi': 'luigi.jpg',
            'Paolo Verdi': 'paolo.jpg'
        };

        const fileName = avatarMap[playerName] || CONFIG.DEFAULT_AVATAR;
        return `${CONFIG.AVATARS_PATH}${fileName}`;
    }

    useSampleData() {
        console.log('📋 Usando dati di esempio');

        this.visits = [
            { Nome: "Mario Rossi", Data: "2024-01-15", Orario: "12:30", Luogo: "McDrive Roma", Note: "Big Mac Menu" },
            { Nome: "Luigi Bianchi", Data: "2024-01-14", Orario: "19:45", Luogo: "McDonald's Milano", Note: "Con amici" },
            { Nome: "Paolo Verdi", Data: "2024-01-13", Orario: "08:15", Luogo: "McDonald's Napoli", Note: "Colazione" },
            { Nome: "Mario Rossi", Data: "2024-01-10", Orario: "18:00", Luogo: "McDonald's Roma", Note: "" },
            { Nome: "Luigi Bianchi", Data: "2024-01-09", Orario: "12:45", Luogo: "McDrive Milano", Note: "Pranzo lavoro" }
        ];

        this.processVisits();
    }

    renderAll() {
        this.updateHeaderStats();
        this.renderPodium();
        this.renderPlayerCards();
        this.renderRecentVisits();
        this.updateFunStats();
    }

    updateHeaderStats() {
        const totalVisits = document.getElementById('total-visits');
        const totalPlayers = document.getElementById('total-players');
        const currentMonth = document.getElementById('current-month');

        if (totalVisits) totalVisits.textContent = this.stats.totalVisits || 0;
        if (totalPlayers) totalPlayers.textContent = this.stats.totalPlayers || 0;
        if (currentMonth) currentMonth.textContent = this.stats.monthlyVisits || 0;
    }

    renderPodium() {
        const podium = document.getElementById('podium');
        if (!podium) return;

        podium.innerHTML = '';

        const top3 = this.players.slice(0, 3);

        if (top3.length === 0) {
            podium.innerHTML = '<p class="no-data">Nessun dato disponibile</p>';
            return;
        }

        // Ordine podio: 2° - 1° - 3°
        const podiumData = [
            { player: top3[1], place: 2, className: 'second' },
            { player: top3[0], place: 1, className: 'first' },
            { player: top3[2], place: 3, className: 'third' }
        ].filter(item => item.player);

        podiumData.forEach(({ player, place, className }) => {
            const podiumPlace = document.createElement('div');
            podiumPlace.className = `podium-place ${className}`;
            podiumPlace.innerHTML = `
                <div class="podium-rank">#${place}</div>
                <img src="${player.avatar}" alt="${player.name}" 
                     class="podium-avatar"
                     onerror="this.src='${CONFIG.AVATARS_PATH}${CONFIG.DEFAULT_AVATAR}'">
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

        if (!container || !template) {
            console.error('Container o template non trovati');
            return;
        }

        container.innerHTML = '';

        if (!this.players || this.players.length === 0) {
            container.innerHTML = '<p class="no-data">Nessun giocatore disponibile</p>';
            return;
        }

        console.log(`Rendering ${this.players.length} giocatori...`);

        this.players.forEach((player, index) => {
            const card = template.content.cloneNode(true);

            // Rank
            const rankEl = card.querySelector('.player-rank');
            if (rankEl) {
                rankEl.textContent = `#${index + 1}`;
                if (player.level && player.level.color) {
                    rankEl.style.backgroundColor = player.level.color;
                }
            }

            // Avatar
            const avatar = card.querySelector('.player-avatar');
            if (avatar) {
                avatar.src = player.avatar;
                avatar.alt = player.name;
                avatar.onerror = function () {
                    this.src = `${CONFIG.AVATARS_PATH}${CONFIG.DEFAULT_AVATAR}`;
                };
            }

            // Level
            const levelBadge = card.querySelector('.player-level');
            if (levelBadge && player.level) {
                levelBadge.textContent = player.level.number || '1';
                levelBadge.title = player.level.name || 'Principiante';
                if (player.level.color) {
                    levelBadge.style.backgroundColor = player.level.color;
                }
            }

            // Name
            const nameEl = card.querySelector('.player-name');
            if (nameEl) {
                nameEl.textContent = player.name;
            }

            // Stats
            const visitsCount = card.querySelector('.visits-count');
            const mcRatio = card.querySelector('.mc-ratio');
            const streak = card.querySelector('.streak');

            if (visitsCount) visitsCount.textContent = player.total || 0;
            if (mcRatio) {
                const ratio = this.stats.totalVisits > 0 ?
                    ((player.total / this.stats.totalVisits) * 100).toFixed(1) : 0;
                mcRatio.textContent = `${ratio}%`;
            }
            if (streak) streak.textContent = player.streak || 0;

            // Dates
            const lastVisitSpan = card.querySelector('.last-visit span');
            const firstVisitSpan = card.querySelector('.first-visit span');

            if (lastVisitSpan) {
                lastVisitSpan.textContent = player.lastVisit ?
                    this.formatDate(player.lastVisit, true) : 'N/A';
            }

            if (firstVisitSpan) {
                firstVisitSpan.textContent = player.firstVisit ?
                    this.formatDate(player.firstVisit) : 'N/A';
            }

            container.appendChild(card);
        });
    }

    renderRecentVisits() {
        const container = document.getElementById('visits-list');
        const template = document.getElementById('visit-item-template');

        if (!container || !template) return;

        container.innerHTML = '';

        if (!this.visits || this.visits.length === 0) {
            container.innerHTML = '<p class="no-visits">Nessuna visita registrata</p>';
            return;
        }

        // Ordina per data (più recenti prima)
        const recentVisits = [...this.visits]
            .filter(v => v.Data || v.date)
            .sort((a, b) => {
                const dateA = new Date(a.Data || a.date);
                const dateB = new Date(b.Data || b.date);
                return dateB - dateA;
            })
            .slice(0, 10);

        recentVisits.forEach(visit => {
            const item = template.content.cloneNode(true);
            const playerName = visit.Nome || visit.name || 'Sconosciuto';

            // Avatar
            const avatar = item.querySelector('.visit-avatar img');
            if (avatar) {
                avatar.src = this.getAvatarUrl(playerName);
                avatar.alt = playerName;
                avatar.onerror = function () {
                    this.src = `${CONFIG.AVATARS_PATH}${CONFIG.DEFAULT_AVATAR}`;
                };
            }

            // Name
            const nameEl = item.querySelector('.visit-person');
            if (nameEl) nameEl.textContent = playerName;

            // Time and location
            const timeEl = item.querySelector('.visit-time');
            if (timeEl) {
                const visitDate = new Date(visit.Data || visit.date);
                const timeStr = visit.Orario || visit.time ? ` alle ${visit.Orario || visit.time}` : '';
                const locationStr = visit.Luogo || visit.location ? ` - ${visit.Luogo || visit.location}` : '';
                timeEl.textContent = `${this.formatDate(visitDate, true)}${timeStr}${locationStr}`;
            }

            // Notes
            const notesEl = item.querySelector('.visit-notes');
            if (notesEl) {
                const notes = visit.Note || visit.notes;
                if (notes && notes.trim()) {
                    notesEl.textContent = notes;
                } else {
                    notesEl.style.display = 'none';
                }
            }

            container.appendChild(item);
        });
    }

    updateFunStats() {
        // Re del Mc
        const kingEl = document.getElementById('king-name');
        if (kingEl) {
            kingEl.textContent = this.players[0] ? this.players[0].name : '-';
        }

        // Record settimanale
        const recordEl = document.getElementById('weekly-record');
        if (recordEl) {
            recordEl.textContent = `${this.stats.weeklyRecord || 0} visite`;
        }

        // Spesa stimata
        const spentEl = document.getElementById('total-spent');
        if (spentEl) {
            spentEl.textContent = `€${(this.stats.totalSpent || 0).toLocaleString('it-IT')}`;
        }

        // Ultima visita
        const lastVisitEl = document.getElementById('last-visit');
        if (lastVisitEl && this.visits.length > 0) {
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
                lastVisitEl.textContent = `${daysAgo} giorni fa (${playerName})`;
            }
        }
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
                console.log(`Filtro: ${this.currentFilter}`);
            });
        });

        // Select time range
        const timeRangeSelect = document.getElementById('time-range');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                console.log(`Filtro tempo: ${this.currentFilter}`);
            });
        }
    }

    formatDate(dateString, short = false) {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (short) {
                if (diffDays === 0) return 'Oggi';
                if (diffDays === 1) return 'Ieri';
                if (diffDays < 7) return `${diffDays} giorni fa`;
            }

            return date.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return 'Data invalida';
        }
    }

    daysSince(date) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
                    <div style="margin-top: 20px; text-align: left;">
                        <h4>Passaggi per risolvere:</h4>
                        <ol>
                            <li>Esegui <strong>update.bat</strong> per generare i dati</li>
                            <li>Assicurati che <strong>data/visits.json</strong> contenga visite</li>
                            <li>Controlla la console del browser per errori (F12)</li>
                        </ol>
                    </div>
                </div>
            `;
        }
    }
}

// Avvia l'app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM caricato, avvio app...');

    // Aggiungi stili CSS extra
    const style = document.createElement('style');
    style.textContent = `
        .error-container {
            text-align: center;
            padding: 50px 20px;
            max-width: 600px;
            margin: 50px auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .error-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        
        .no-data, .no-visits {
            text-align: center;
            padding: 40px;
            color: #666;
            font-style: italic;
            background: white;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .loading {
            text-align: center;
            padding: 50px;
            font-size: 1.2rem;
            color: #666;
        }
        
        .loading i {
            font-size: 3rem;
            color: #FFC72C;
            margin-bottom: 20px;
        }
    `;
    document.head.appendChild(style);

    // Mostra loading iniziale
    const container = document.querySelector('.container');
    if (container) {
        const loadingHtml = `
            <div class="loading">
                <i class="fas fa-hamburger fa-spin"></i>
                <h2>Caricamento McRanking...</h2>
                <p>Preparando le patatine 🍟</p>
            </div>
        `;
        container.insertAdjacentHTML('afterbegin', loadingHtml);
    }

    // Avvia l'app dopo un breve delay
    setTimeout(() => {
        window.app = new McRankingJSONApp();
    }, 500);
});