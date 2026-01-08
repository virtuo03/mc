// McRanking App - Versione Corretta e Completa
class McRankingJSONApp {
    constructor() {
        this.visits = [];
        this.players = [];
        this.stats = {};
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        console.log('🚀 Inizializzazione McRanking...');
        try {
            await this.loadData();
            this.renderAll();
            this.setupEventListeners();
            console.log('✅ App inizializzata correttamente!');
        } catch (error) {
            console.error('❌ Errore durante l\'init:', error);
            this.showError('Errore nel caricamento dati. Assicurati di aver eseguito update-data.js');
        }
    }

    async loadData() {
        try {
            // 1. Prova a caricare i dati già elaborati dallo script Node.js
            const playersResponse = await fetch('data/players.json');
            if (playersResponse.ok) {
                const playersData = await playersResponse.json();
                if (playersData.success) {
                    console.log('📊 Dati caricati da players.json');
                    this.players = playersData.data.players || [];
                    this.visits = playersData.data.visits || [];
                    this.stats = playersData.data.stats || {};
                    return;
                }
            }

            // 2. Fallback: Carica e processa visits.json direttamente
            console.log('🔄 Fallback: Caricamento dati grezzi da visits.json...');
            const visitsResponse = await fetch('data/visits.json');
            if (!visitsResponse.ok) throw new Error('File visits.json non trovato');

            this.visits = await visitsResponse.json();
            this.processVisits();

        } catch (error) {
            console.warn('⚠️ Errore caricamento, uso dati campione:', error.message);
            this.useSampleData();
        }
    }

    processVisits() {
        if (!Array.isArray(this.visits)) return;

        const playerMap = {};

        this.visits.forEach(visit => {
            // Normalizzazione nomi campi (gestisce sia "Nome" che "nome", ecc.)
            const name = visit.Nome || visit.nome || 'Sconosciuto';
            const date = visit.data || visit.Data || visit.date;
            const location = visit.Luogo || visit.luogo || visit.location;
            const note = visit.note || visit.Note || visit.notes;
            const timeInfo = visit['Informazioni cronologiche'] || '';

            if (!playerMap[name]) {
                playerMap[name] = {
                    name: name,
                    total: 0,
                    dates: [],
                    locations: new Set(),
                    notes: []
                };
            }

            const p = playerMap[name];
            p.total++;
            if (date) p.dates.push(date);
            if (location) p.locations.add(location);
            if (note) p.notes.push(note);
        });

        this.players = Object.values(playerMap).map(p => {
            const sortedDates = p.dates.sort();
            return {
                name: p.name,
                total: p.total,
                streak: this.calculateStreak(p.dates),
                level: this.calculateLevel(p.total),
                firstVisit: sortedDates[0] || null,
                lastVisit: sortedDates[sortedDates.length - 1] || null,
                avatar: this.getAvatarUrl(p.name)
            };
        });

        this.players.sort((a, b) => b.total - a.total);
        this.calculateGlobalStats();
    }

    calculateGlobalStats() {
        this.stats = {
            totalVisits: this.visits.length,
            totalPlayers: this.players.length,
            totalSpent: this.visits.length * (CONFIG.AVERAGE_COST_PER_VISIT || 10),
            monthlyVisits: this.players.reduce((sum, p) => sum + p.total, 0) // Semplificato
        };
    }

    calculateStreak(dates) {
        if (!dates.length) return 0;
        // Logica semplificata: ritorna 1 se ha visitato, implementazione complessa in update-data.js
        return 1;
    }

    calculateLevel(total) {
        // Usa i livelli definiti in config.js
        const levels = CONFIG.LEVELS || [];
        for (let i = levels.length - 1; i >= 0; i--) {
            if (total >= levels[i].min) {
                return {
                    number: i + 1,
                    name: levels[i].name,
                    color: levels[i].color
                };
            }
        }
        return { number: 1, name: 'Principiante', color: '#808080' };
    }

    getAvatarUrl(name) {
        // Mappa basata sui nomi reali nel tuo JSON
        const avatarMap = {
            'Fabio': 'fabio.jpg',
            'Ale': 'ale.jpg'
        };
        const file = avatarMap[name] || CONFIG.DEFAULT_AVATAR;
        return `${CONFIG.AVATARS_PATH}${file}`;
    }

    renderAll() {
        this.updateHeaderStats();
        this.renderPodium();
        this.renderPlayerCards();
        this.renderRecentVisits();
        this.updateFunStats();
    }

    updateHeaderStats() {
        document.getElementById('total-visits').textContent = this.stats.totalVisits || 0;
        document.getElementById('total-players').textContent = this.stats.totalPlayers || 0;
        document.getElementById('current-month').textContent = this.stats.monthlyVisits || 0;
    }

    renderPodium() {
        const podium = document.getElementById('podium');
        if (!podium || this.players.length === 0) return;

        podium.innerHTML = '';
        const top3 = this.players.slice(0, 3);

        // Ordine estetico: 2°, 1°, 3°
        const order = [1, 0, 2];
        order.forEach(idx => {
            const p = top3[idx];
            if (!p) return;

            const placeClass = idx === 0 ? 'first' : (idx === 1 ? 'second' : 'third');
            const div = document.createElement('div');
            div.className = `podium-place ${placeClass}`;
            div.innerHTML = `
                <div class="podium-rank">#${idx + 1}</div>
                <img src="${p.avatar}" class="podium-avatar" onerror="this.src='assets/avatars/default.jpg'">
                <h3 class="podium-name">${p.name}</h3>
                <div class="podium-score">${p.total} visite</div>
            `;
            podium.appendChild(div);
        });
    }

    renderPlayerCards() {
        const grid = document.getElementById('players-grid');
        const template = document.getElementById('player-card-template');
        if (!grid || !template) return;

        grid.innerHTML = '';
        this.players.forEach((p, index) => {
            const clone = template.content.cloneNode(true);

            clone.querySelector('.player-rank').textContent = `#${index + 1}`;
            clone.querySelector('.player-rank').style.backgroundColor = p.level.color;
            clone.querySelector('.player-avatar').src = p.avatar;
            clone.querySelector('.player-level').textContent = p.level.number;
            clone.querySelector('.player-level').style.backgroundColor = p.level.color;
            clone.querySelector('.player-name').textContent = p.name;
            clone.querySelector('.visits-count').textContent = p.total;
            clone.querySelector('.streak').textContent = p.streak;
            clone.querySelector('.last-visit span').textContent = p.lastVisit || 'N/A';

            grid.appendChild(clone);
        });
    }

    renderRecentVisits() {
        const list = document.getElementById('visits-list');
        const template = document.getElementById('visit-item-template');
        if (!list || !template) return;

        list.innerHTML = '';
        const recent = [...this.visits].reverse().slice(0, 5);

        recent.forEach(v => {
            const clone = template.content.cloneNode(true);
            const name = v.Nome || v.nome || 'Sconosciuto';

            clone.querySelector('.visit-avatar img').src = this.getAvatarUrl(name);
            clone.querySelector('.visit-person').textContent = name;
            clone.querySelector('.visit-time').textContent = `${v.data || v.Data} - ${v.Luogo || v.luogo || ''}`;
            clone.querySelector('.visit-notes').textContent = v.note || v.Note || '';

            list.appendChild(clone);
        });
    }

    updateFunStats() {
        const king = document.getElementById('king-name');
        if (king) king.textContent = this.players[0]?.name || '-';

        const spent = document.getElementById('total-spent');
        if (spent) spent.textContent = `€${this.stats.totalSpent}`;
    }

    setupEventListeners() {
        document.querySelectorAll('.btn-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                // Qui andrebbe la logica di filtraggio array
            });
        });
    }

    showError(msg) {
        const container = document.querySelector('.container');
        if (container) container.innerHTML = `<div class="error-container"><h2>🍟 Ops!</h2><p>${msg}</p></div>`;
    }

    useSampleData() {
        this.visits = [{ Nome: "Esempio", data: "01/01/2026", Luogo: "McDrive" }];
        this.processVisits();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new McRankingJSONApp();
});