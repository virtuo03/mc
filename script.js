class McRankingJSONApp {
    constructor() {
        this.allVisits = []; // Backup di tutte le visite
        this.filteredVisits = [];
        this.players = [];
        this.stats = {};
        this.playerModal = null;
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.applyFilter('all'); // Filtro iniziale
            this.setupEventListeners();
            this.playerModal = new PlayerModal(this);
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

        // Aggiungi event listener alle card dopo il render
        this.setupPlayerCardClick();
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

            // MOSTRA LIVELLO (numero e nome)
            const levelElement = clone.querySelector('.player-level');
            levelElement.textContent = p.level.number;
            levelElement.style.backgroundColor = p.level.color;
            levelElement.title = `${p.level.name}`; // Tooltip con nome livello

            clone.querySelector('.player-name').textContent = p.name;
            clone.querySelector('.visits-count').textContent = p.total;

            // AGGIUNGI NOME LIVELLO SOTTO IL NOME
            const levelName = document.createElement('p');
            levelName.className = 'player-level-name';
            levelName.textContent = p.level.name;
            levelName.style.color = p.level.color;
            levelName.style.fontWeight = '600';
            levelName.style.marginTop = '-10px';
            levelName.style.marginBottom = '5px'; // Ridotto da 10px a 5px
            levelName.style.fontSize = '0.9rem';
            levelName.style.textTransform = 'uppercase';
            levelName.style.letterSpacing = '0.5px';

            clone.querySelector('.player-info').insertBefore(
                levelName,
                clone.querySelector('.player-stats')
            );

            // CALCOLA PROGRESSO VERSO LIVELLO SUCCESSIVO
            // Trova il livello corrente nelle configurazioni
            const currentLevelConfig = CONFIG.LEVELS.find(l =>
                p.total >= l.min && p.total <= l.max
            );

            let progressPercent = 100;
            let nextLevelName = '';
            let visitsNeeded = 0;

            if (currentLevelConfig) {
                const currentLevelIndex = CONFIG.LEVELS.indexOf(currentLevelConfig);

                // Se non è l'ultimo livello, calcola progresso verso il prossimo
                if (currentLevelIndex < CONFIG.LEVELS.length - 1) {
                    const nextLevelConfig = CONFIG.LEVELS[currentLevelIndex + 1];
                    nextLevelName = nextLevelConfig.name;

                    // Calcola percentuale di completamento del livello corrente
                    const levelRange = currentLevelConfig.max - currentLevelConfig.min;
                    if (levelRange > 0) {
                        progressPercent = Math.min(
                            ((p.total - currentLevelConfig.min) / levelRange) * 100,
                            100
                        );
                    }

                    // Calcola visite mancanti per livello successivo
                    visitsNeeded = nextLevelConfig.min - p.total;
                }
            }

            // AGGIUNGI BARRA DI PROGRESSO
            const progressBar = document.createElement('div');
            progressBar.className = 'level-progress';
            progressBar.innerHTML = `
            <div class="level-progress-fill" 
                 style="width: ${progressPercent}%; 
                        background-color: ${p.level.color};"></div>
        `;

            // Inserisci la barra di progresso
            const playerInfo = clone.querySelector('.player-info');
            const playerStats = clone.querySelector('.player-stats');
            playerInfo.insertBefore(progressBar, playerStats);

            // AGGIUNGI TESTO CON VISITE MANCANTI (solo se non è l'ultimo livello)
            if (visitsNeeded > 0 && nextLevelName) {
                const neededText = document.createElement('div');
                neededText.className = 'level-need';
                neededText.innerHTML = `
                <span class="level-need-icon">📈</span>
                <span class="level-need-text">${visitsNeeded} per ${nextLevelName}</span>
            `;

                // Inserisci dopo la barra di progresso
                progressBar.insertAdjacentElement('afterend', neededText);
            }

            grid.appendChild(clone);
        });
    }

    // Aggiungi questo metodo
    setupPlayerCardClick() {
        const playerCards = document.querySelectorAll('.player-card');

        playerCards.forEach((card, index) => {
            // Rimuovi eventuali listener precedenti
            card.removeEventListener('click', card.clickHandler);

            // Crea un nuovo handler
            card.clickHandler = () => {
                const player = this.players[index];
                if (player && this.playerModal) {
                    this.playerModal.open(player);
                }
            };

            // Aggiungi l'event listener
            card.addEventListener('click', card.clickHandler);
            card.style.cursor = 'pointer';
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

    // Metodo per mostrare errori (se necessario)
    showError(message) {
        console.error(message);
        // Puoi implementare una UI per mostrare errori
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new McRankingJSONApp();
});