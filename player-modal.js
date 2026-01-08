class PlayerModal {
    constructor(app) {
        this.app = app;
        this.modal = null;
        this.currentPlayer = null;
        
        this.init();
    }

    init() {
        this.createModal();
        this.setupCloseHandlers();
    }

    createModal() {
        // Crea il modal
        this.modal = document.createElement('div');
        this.modal.className = 'player-modal';
        this.modal.innerHTML = `
            <div class="player-modal-backdrop"></div>
            <div class="player-modal-content">
                <button class="player-modal-close">
                    <i class="fas fa-times"></i>
                </button>
                
                <div class="player-modal-header">
                    <div class="modal-player-avatar">
                        <img src="" alt="">
                    </div>
                    <div class="modal-player-info">
                        <h2 class="modal-player-name"></h2>
                        <div class="modal-player-level"></div>
                        <div class="modal-player-rank"></div>
                    </div>
                </div>
                
                <div class="player-modal-body">
                    <div class="modal-stats-grid">
                        <div class="modal-stat">
                            <div class="modal-stat-value" id="modal-total-visits">0</div>
                            <div class="modal-stat-label">Visite Totali</div>
                        </div>
                        <div class="modal-stat">
                            <div class="modal-stat-value" id="modal-avg-monthly">0</div>
                            <div class="modal-stat-label">Media Mensile</div>
                        </div>
                    </div>
                    
                    <div class="modal-section">
                        <h3><i class="fas fa-map-marker-alt"></i> Luoghi Frequenti</h3>
                        <div class="modal-locations" id="modal-locations"></div>
                    </div>
                    
                    <div class="modal-section">
                        <h3><i class="fas fa-history"></i> Ultime Visite</h3>
                        <div class="modal-visits-list" id="modal-visits-list"></div>
                    </div>
                </div>
                
                <div class="player-modal-footer">
                    <div class="modal-progress">
                        <div class="modal-progress-text">
                            Progresso verso livello successivo:
                            <span id="modal-next-level">-</span>
                        </div>
                        <div class="modal-progress-bar">
                            <div class="modal-progress-fill"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }

    setupCloseHandlers() {
        // Chiudi cliccando sul backdrop
        this.modal.querySelector('.player-modal-backdrop').addEventListener('click', () => {
            this.close();
        });
        
        // Chiudi cliccando sul pulsante X
        this.modal.querySelector('.player-modal-close').addEventListener('click', () => {
            this.close();
        });
        
        // Chiudi con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    }

    open(player) {
        this.currentPlayer = player;
        this.updateModalContent();
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Disabilita scroll
    }

    close() {
        this.modal.classList.remove('active');
        document.body.style.overflow = ''; // Riabilita scroll
    }

    updateModalContent() {
        if (!this.currentPlayer) return;
        
        const player = this.currentPlayer;
        
        // Header
        this.modal.querySelector('.modal-player-avatar img').src = player.avatar;
        this.modal.querySelector('.modal-player-name').textContent = player.name;
        
        // Livello
        const levelElement = this.modal.querySelector('.modal-player-level');
        levelElement.textContent = player.level.name;
        levelElement.style.backgroundColor = player.level.color;
        levelElement.style.color = this.getContrastColor(player.level.color);
        
        // Rank
        const playerIndex = this.app.players.findIndex(p => p.name === player.name);
        this.modal.querySelector('.modal-player-rank').textContent = `#${playerIndex + 1} in classifica`;
        
        // Statistiche
        const playerVisits = this.app.allVisits.filter(v => v.Nome === player.name);
        this.calculateAndDisplayStats(player, playerVisits);
    }

    calculateAndDisplayStats(player, playerVisits) {
        // Statistiche di base
        document.getElementById('modal-total-visits').textContent = player.total;
        
        // Media mensile
        const firstVisit = this.getFirstVisit(playerVisits);
        const monthsDiff = this.monthDifference(firstVisit, new Date());
        const avgMonthly = monthsDiff > 0 ? (player.total / monthsDiff).toFixed(1) : player.total;
        document.getElementById('modal-avg-monthly').textContent = avgMonthly;
        
        // Luoghi frequenti
        this.displayFrequentLocations(playerVisits);
        
        // Ultime visite
        this.displayRecentVisits(playerVisits);
        
        // Progresso verso livello successivo
        this.displayLevelProgress(player);
    }

    displayFrequentLocations(playerVisits) {
        const locationsContainer = document.getElementById('modal-locations');
        locationsContainer.innerHTML = '';
        
        // Conta frequenze luoghi
        const locationCounts = {};
        playerVisits.forEach(visit => {
            const location = visit.Luogo || 'Sconosciuto';
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        });
        
        // Ordina per frequenza
        const sortedLocations = Object.entries(locationCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        if (sortedLocations.length === 0) {
            locationsContainer.innerHTML = '<p class="no-data">Nessun luogo registrato</p>';
            return;
        }
        
        sortedLocations.forEach(([location, count]) => {
            const locationElement = document.createElement('div');
            locationElement.className = 'modal-location-item';
            locationElement.innerHTML = `
                <span class="location-name">${location}</span>
                <span class="location-count">${count} visite</span>
            `;
            locationsContainer.appendChild(locationElement);
        });
    }

    displayRecentVisits(playerVisits) {
        const visitsContainer = document.getElementById('modal-visits-list');
        visitsContainer.innerHTML = '';
        
        // Ordina per data (più recenti prima)
        const recentVisits = [...playerVisits]
            .sort((a, b) => {
                const dateA = this.parseDate(a.data);
                const dateB = this.parseDate(b.data);
                return dateB - dateA;
            })
            .slice(0, 10); // Ultime 10 visite
        
        if (recentVisits.length === 0) {
            visitsContainer.innerHTML = '<p class="no-data">Nessuna visita registrata</p>';
            return;
        }
        
        recentVisits.forEach(visit => {
            const visitElement = document.createElement('div');
            visitElement.className = 'modal-visit-item';
            visitElement.innerHTML = `
                <div class="modal-visit-date">${visit.data}</div>
                <div class="modal-visit-location">${visit.Luogo || 'Sconosciuto'}</div>
                ${visit.note ? `<div class="modal-visit-note">"${visit.note}"</div>` : ''}
            `;
            visitsContainer.appendChild(visitElement);
        });
    }

    displayLevelProgress(player) {
        const nextLevelText = document.getElementById('modal-next-level');
        const progressBar = this.modal.querySelector('.modal-progress-fill');
        
        // Trova livello corrente
        const currentLevelConfig = CONFIG.LEVELS.find(l =>
            player.total >= l.min && player.total <= l.max
        );
        
        if (currentLevelConfig) {
            const currentLevelIndex = CONFIG.LEVELS.indexOf(currentLevelConfig);
            
            if (currentLevelIndex < CONFIG.LEVELS.length - 1) {
                const nextLevelConfig = CONFIG.LEVELS[currentLevelIndex + 1];
                const levelRange = currentLevelConfig.max - currentLevelConfig.min;
                const progressPercent = levelRange > 0
                    ? Math.min(((player.total - currentLevelConfig.min) / levelRange) * 100, 100)
                    : 100;
                
                nextLevelText.textContent = `${nextLevelConfig.name} (${nextLevelConfig.min} visite)`;
                progressBar.style.width = `${progressPercent}%`;
                progressBar.style.backgroundColor = player.level.color;
            } else {
                nextLevelText.textContent = "Livello massimo raggiunto!";
                progressBar.style.width = '100%';
                progressBar.style.backgroundColor = player.level.color;
            }
        }
    }

    // Utility functions
    getFirstVisit(playerVisits) {
        if (playerVisits.length === 0) return new Date();
        
        const dates = playerVisits
            .map(v => this.parseDate(v.data))
            .filter(date => !isNaN(date.getTime()));
        
        return dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
    }

    parseDate(dateString) {
        if (!dateString) return new Date();
        const [day, month, year] = dateString.split('/');
        return new Date(year, month - 1, day);
    }

    monthDifference(date1, date2) {
        const months = (date2.getFullYear() - date1.getFullYear()) * 12;
        return months + date2.getMonth() - date1.getMonth() + 1; // +1 per evitare 0
    }

    getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return black or white depending on luminance
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }
}

// Stili CSS per il modal (versione semplificata)
const modalStyles = `
.player-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    display: none;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.player-modal.active {
    display: block;
    opacity: 1;
}

.player-modal-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
}

.player-modal-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    width: 90%;
    max-width: 700px;
    max-height: 90vh;
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.player-modal.active .player-modal-content {
    transform: translate(-50%, -50%) scale(1);
}

.player-modal-close {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--mc-red);
    color: white;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    z-index: 10;
    transition: all 0.3s ease;
}

.player-modal-close:hover {
    background: #c82333;
    transform: rotate(90deg);
}

.player-modal-header {
    background: linear-gradient(135deg, var(--mc-red) 0%, var(--mc-yellow) 100%);
    padding: 40px 30px 30px;
    color: white;
    display: flex;
    align-items: center;
    gap: 25px;
    position: relative;
}

.modal-player-avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 5px solid white;
    overflow: hidden;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    flex-shrink: 0;
}

.modal-player-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.modal-player-info {
    flex: 1;
    min-width: 0;
}

.modal-player-name {
    font-size: 2.5rem;
    margin-bottom: 10px;
    font-weight: 700;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.modal-player-level {
    display: inline-block;
    padding: 8px 16px;
    border-radius: 50px;
    font-weight: 700;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-player-rank {
    font-size: 1.1rem;
    opacity: 0.9;
    font-weight: 500;
}

.player-modal-body {
    padding: 30px;
    overflow-y: auto;
    max-height: calc(90vh - 300px);
}

.modal-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.modal-stat {
    background: var(--mc-gray);
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    transition: transform 0.3s ease;
}

.modal-stat:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow);
}

.modal-stat-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--mc-red);
    margin-bottom: 5px;
}

.modal-stat-label {
    font-size: 0.9rem;
    color: #666;
    font-weight: 500;
}

.modal-section {
    margin-bottom: 30px;
    padding-bottom: 25px;
    border-bottom: 1px solid #eee;
}

.modal-section:last-of-type {
    border-bottom: none;
    margin-bottom: 0;
}

.modal-section h3 {
    font-size: 1.3rem;
    color: var(--mc-dark);
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.modal-section h3 i {
    color: var(--mc-yellow);
}

.modal-locations {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.modal-location-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 10px;
    transition: all 0.3s ease;
}

.modal-location-item:hover {
    background: #e9ecef;
    transform: translateX(5px);
}

.location-name {
    font-weight: 500;
    color: var(--mc-dark);
}

.location-count {
    background: var(--mc-yellow);
    color: var(--mc-dark);
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
}

.modal-visits-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.modal-visit-item {
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 10px;
    border-left: 4px solid var(--mc-yellow);
    transition: all 0.3s ease;
}

.modal-visit-item:hover {
    background: #e9ecef;
    transform: translateX(5px);
}

.modal-visit-date {
    font-weight: 600;
    color: var(--mc-red);
    margin-bottom: 5px;
    font-size: 0.9rem;
}

.modal-visit-location {
    color: var(--mc-dark);
    margin-bottom: 3px;
    font-size: 0.95rem;
}

.modal-visit-note {
    color: #666;
    font-size: 0.85rem;
    font-style: italic;
    margin-top: 5px;
}

.player-modal-footer {
    padding: 20px 30px;
    background: #f8f9fa;
    border-top: 1px solid #eee;
}

.modal-progress {
    width: 100%;
}

.modal-progress-text {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-progress-text span {
    font-weight: 700;
    color: var(--mc-dark);
}

.modal-progress-bar {
    height: 10px;
    background: #e0e0e0;
    border-radius: 5px;
    overflow: hidden;
}

.modal-progress-fill {
    height: 100%;
    border-radius: 5px;
    width: 0%;
    transition: width 0.8s ease;
}

.no-data {
    text-align: center;
    color: #999;
    font-style: italic;
    padding: 20px;
}

/* Responsive */
@media (max-width: 768px) {
    .player-modal-header {
        flex-direction: column;
        text-align: center;
        padding: 30px 20px;
    }
    
    .modal-player-avatar {
        width: 100px;
        height: 100px;
    }
    
    .modal-player-name {
        font-size: 2rem;
    }
    
    .modal-stats-grid {
        grid-template-columns: 1fr;
    }
    
    .player-modal-body {
        padding: 20px;
        max-height: calc(90vh - 350px);
    }
    
    .modal-stat-value {
        font-size: 2rem;
    }
}

@media (max-width: 480px) {
    .modal-player-name {
        font-size: 1.8rem;
    }
    
    .player-modal-content {
        width: 95%;
    }
}
`;

// Aggiungi gli stili al documento
document.addEventListener('DOMContentLoaded', () => {
    const styleElement = document.createElement('style');
    styleElement.textContent = modalStyles;
    document.head.appendChild(styleElement);
});
