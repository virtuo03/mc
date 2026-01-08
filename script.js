class McRankingJSONApp {
    constructor() {
        this.allVisits = []; // Backup di tutte le visite
        this.filteredVisits = [];
        this.players = [];
        this.stats = {};
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.applyFilter('all'); // Filtro iniziale
            this.setupEventListeners();
        } catch (error) {
            console.error('Errore:', error);
            this.showError('Errore nel caricamento dati.');
        }
    }

    async loadData() {
        const response = await fetch('data/players.json');
        const result = await response.json();
        if (result.success) {
            this.allVisits = result.data.visits;
        }
    }

    // --- LOGICA FILTRI ---
    applyFilter(filterType) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        this.filteredVisits = this.allVisits.filter(v => {
            const [day, month, year] = v.data.split('/');
            const visitDate = new Date(year, month - 1, day);

            if (filterType === 'today') {
                return visitDate >= startOfToday;
            } else if (filterType === 'week') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return visitDate >= oneWeekAgo;
            } else if (filterType === 'month') {
                return visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
            }
            return true; // 'all'
        });

        this.processData();
        this.renderAll();
    }

    processData() {
        const playerMap = {};
        this.filteredVisits.forEach(v => {
            const name = v.Nome || 'Sconosciuto';
            if (!playerMap[name]) {
                playerMap[name] = { name: name, total: 0 };
            }
            playerMap[name].total++;
        });

        this.players = Object.values(playerMap)
            .map(p => ({
                name: p.name,
                total: p.total,
                level: this.calculateLevel(p.total),
                avatar: this.getAvatarUrl(p.name)
            }))
            .sort((a, b) => b.total - a.total);

        this.stats = {
            totalVisits: this.filteredVisits.length,
            totalPlayers: this.players.length
        };
    }

    calculateLevel(total) {
        const levels = CONFIG.LEVELS || [];
        for (let i = levels.length - 1; i >= 0; i--) {
            if (total >= levels[i].min) {
                return { number: i + 1, name: levels[i].name, color: levels[i].color };
            }
        }
        return { number: 1, name: 'Principiante', color: '#808080' };
    }

    getAvatarUrl(name) {
        const avatarMap = { 'Max': 'max.jpg', 'Easy': 'easy.jpg', 'Ale': 'ale.jpg', 'Kej': 'kej.jpg', 'Zani': 'zani.jpg', 'Marco': 'marco.jpg', 'Fabio': 'fabio.jpg', 'Giova': 'giova.jpg' };
        return `${CONFIG.AVATARS_PATH}${avatarMap[name] || CONFIG.DEFAULT_AVATAR}`;
    }

    renderAll() {
        document.getElementById('total-visits').textContent = this.stats.totalVisits;
        document.getElementById('total-players').textContent = this.stats.totalPlayers;

        this.renderPodium();
        this.renderPlayerCards();
        this.renderRecentVisits();
        this.updateFunStats(); // Assicurati che questa riga sia presente
    }

    updateFunStats() {
        const kingNameDisplay = document.getElementById('king-name');
        const gymKingDisplay = document.getElementById('gym-king-name'); // Nuovo elemento

        if (!kingNameDisplay) return;

        // Il re del Mc è il primo giocatore (più visite)
        if (this.players.length > 0) {
            const king = this.players[0];
            kingNameDisplay.textContent = `${king.name} (${king.total} visite)`;
        } else {
            kingNameDisplay.textContent = "Nessuno";
        }

        // Il re della Gym è l'ultimo giocatore (meno visite)
        if (this.players.length > 1) {
            const gymKing = this.players[this.players.length - 1];
            if (gymKingDisplay) {
                gymKingDisplay.textContent = `${gymKing.name} (${gymKing.total} visite)`;
            }
        } else if (gymKingDisplay) {
            gymKingDisplay.textContent = "Nessuno";
        }
    }

    renderPodium() {
        const podium = document.getElementById('podium');
        podium.innerHTML = '';
        const top3 = this.players.slice(0, 3);
        const order = [1, 0, 2];
        order.forEach(idx => {
            const p = top3[idx];
            if (!p) return;
            const div = document.createElement('div');
            div.className = `podium-place ${idx === 0 ? 'first' : (idx === 1 ? 'second' : 'third')}`;
            div.innerHTML = `
                <div class="podium-rank">#${idx + 1}</div>
                <img src="${p.avatar}" class="podium-avatar" onerror="this.src='assets/avatars/default.jpg'">
                <h3 class="podium-name">${p.name}</h3>
                <div class="podium-score">${p.total} visite</div>`;
            podium.appendChild(div);
        });
    }

    renderPlayerCards() {
        const grid = document.getElementById('players-grid');
        const template = document.getElementById('player-card-template');
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
            grid.appendChild(clone);
        });
    }

    renderRecentVisits() {
        const list = document.getElementById('visits-list');
        const template = document.getElementById('visit-item-template');
        list.innerHTML = '';
        [...this.filteredVisits].reverse().slice(0, 5).forEach(v => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('.visit-avatar img').src = this.getAvatarUrl(v.Nome);
            clone.querySelector('.visit-person').textContent = v.Nome;
            clone.querySelector('.visit-time').textContent = `${v.data} - ${v.Luogo}`;
            clone.querySelector('.visit-notes').textContent = v.note || '';
            list.appendChild(clone);
        });
    }

    setupEventListeners() {
        document.querySelectorAll('.btn-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyFilter(btn.dataset.filter);
            });
        });

        document.getElementById('time-range').addEventListener('change', (e) => {
            this.applyFilter(e.target.value);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => { new McRankingJSONApp(); });