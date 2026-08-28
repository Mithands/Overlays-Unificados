/**
 * ==========================================================================
 * ACHIEVEMENTS-VIEW-APP.JS - Standalone Achievement Alert Controller for OBS
 * ==========================================================================
 */

class AchievementsViewApp {
    constructor() {
        this.container = document.getElementById('achievements-viewport');
        this.audioElement = new Audio('sounds/logro.mp3');
        this.audioElement.volume = 0.8;

        this.queue = [];
        this.isProcessing = false;
        this.DISPLAY_DURATION = 8000; // 8 segundos por alerta
        this.FADE_DURATION = 500;     // 0.5s animación de salida

        console.log('🏆 AchievementsViewApp: Initialized and listening for achievement events...');
        this.initEventListeners();
    }

    initEventListeners() {
        // 1. Escuchar vía BroadcastChannel (Cross-Window / Cross-Source en tiempo real)
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                this.channel = new BroadcastChannel('mithands_achievements_channel');
                this.channel.onmessage = (event) => {
                    if (event.data && event.data.type === 'achievement_unlocked') {
                        this.enqueue(event.data.data);
                    }
                };
                console.log('📡 BroadcastChannel "mithands_achievements_channel" conectado con éxito.');
            }
        } catch (e) {
            console.warn('⚠️ Error conectando BroadcastChannel:', e);
        }

        // 2. Fallback vía Storage Event
        window.addEventListener('storage', (event) => {
            if (event.key === 'mithands_latest_achievement' && event.newValue) {
                try {
                    const data = JSON.parse(event.newValue);
                    this.enqueue(data);
                } catch (e) {
                    console.error('Error parseando logro desde localStorage:', e);
                }
            }
        });

        // 3. Exponer función de prueba global para test-panel o consola
        window.testAchievement = (customData = {}) => {
            const mock = {
                username: customData.username || 'Playmithttv',
                achievement: customData.achievement || {
                    id: 'first_hack',
                    name: 'First Hack',
                    description: '¡Primer mensaje!',
                    condition: 'Primer mensaje al iniciar stream (x2 XP)',
                    category: 'stream',
                    rarity: 'rare',
                    icon: '⚡',
                    image: 'img/logros/first_hack.png'
                },
                timestamp: Date.now()
            };
            this.enqueue(mock);
        };
    }

    /**
     * Añade un logro a la cola de alertas
     * @param {Object} data { username, achievement }
     */
    enqueue(data) {
        if (!data || !data.achievement) return;

        console.log(`🏆 [ACHIEVEMENT RECEIVED] -> "${data.achievement.name}" para ${data.username}`);
        this.queue.push(data);
        this.processQueue();
    }

    /**
     * Procesa la cola una a una
     */
    processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const current = this.queue.shift();
        this.displayAchievement(current);
    }

    /**
     * Renderiza y anima la alerta en pantalla
     * @param {Object} data 
     */
    displayAchievement(data) {
        const { username, achievement } = data;
        if (!this.container) return;

        // Reproducir sonido
        try {
            this.audioElement.currentTime = 0;
            this.audioElement.play().catch(e => console.log('Audio autoplay bloqueado o no interactuado:', e));
        } catch (e) {
            console.warn('Error al reproducir audio de logro:', e);
        }

        const rarity = (achievement.rarity || 'common').toLowerCase();
        const imageSrc = achievement.image || 'img/logros/default.png';
        const conditionText = achievement.condition ? `[${achievement.condition}]` : '';

        // Crear elemento Card
        const card = document.createElement('div');
        card.className = 'cp-achievement-card';
        card.setAttribute('data-rarity', rarity);
        card.style.setProperty('--display-duration', `${this.DISPLAY_DURATION / 1000}s`);

        card.innerHTML = `
            <div class="cp-deco-corner">ACH.SYS//${rarity.toUpperCase()}</div>
            <div class="cp-icon-frame">
                <img src="${imageSrc}" alt="${achievement.name}" onerror="this.onerror=null;this.src='img/logros/default.png';">
            </div>
            <div class="cp-content-frame">
                <div class="cp-meta-row">
                    <span class="cp-header-tag">LOGRO DESBLOQUEADO</span>
                    <span class="cp-user-badge">MERC: ${username}</span>
                </div>
                <div class="cp-title-row">${achievement.name}</div>
                <div class="cp-desc-row">
                    <span>${achievement.description}</span>
                    <span class="cp-condition-tag">${conditionText}</span>
                </div>
            </div>
            <div class="cp-timer-bar"></div>
        `;

        this.container.appendChild(card);

        // Animar entrada
        requestAnimationFrame(() => {
            card.classList.add('active');
        });

        // Programar salida
        setTimeout(() => {
            card.classList.remove('active');
            card.classList.add('leaving');

            setTimeout(() => {
                if (card.parentNode) {
                    card.parentNode.removeChild(card);
                }
                this.isProcessing = false;
                this.processQueue(); // Siguiente en la cola
            }, this.FADE_DURATION);

        }, this.DISPLAY_DURATION);
    }
}

// Arrancar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.ACHIEVEMENTS_VIEW_APP = new AchievementsViewApp();
});
