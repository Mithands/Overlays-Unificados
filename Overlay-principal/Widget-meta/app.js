/**
 * Cyberpunk Stream Goal Widget - Twitch Live Sync & Real-Time SE WebSocket
 * Overlays Mithands
 */

class StreamGoalWidget {
    constructor(config) {
        this.config = config || {};
        this.channel = this.config.CHANNEL || 'mithands';
        this.targetGoal = this.config.TARGET_GOAL || 75;
        this.token = this.config.SE_JWT_TOKEN || '';
        
        this.currentCount = 74; // Fallback inicial real
        this.socket = null;
        this.pollTimer = null;

        // Cargar caché local previo si existe
        const cached = localStorage.getItem('mithands_goal_followers');
        if (cached && !isNaN(parseInt(cached))) {
            this.currentCount = parseInt(cached);
        }
    }

    init() {
        this.setupCustomTexts();
        this.updateUI(this.currentCount, false);

        // 1. Obtener datos exactos de Twitch de inmediato
        this.fetchTwitchFollowers();

        // 2. Conectar WebSocket para eventos en tiempo real
        this.connectRealtime();

        // 3. Sincronización periódica de respaldo
        const interval = this.config.POLL_INTERVAL || 45000;
        this.pollTimer = setInterval(() => this.fetchTwitchFollowers(), interval);

        // 4. Conectar con el Master Control Dock de OBS (0 ms)
        this.connectMasterDock();
    }

    connectMasterDock() {
        const handleDockMsg = (msg) => {
            if (!msg || !msg.type) return;
            if (msg.type === 'dock:goalUpdate' && msg.data) {
                if (msg.data.followerGoal) {
                    this.targetGoal = parseInt(msg.data.followerGoal, 10) || this.targetGoal;
                }
                if (msg.data.goalTitle) {
                    const titleEl = document.getElementById('goalTitle');
                    if (titleEl) titleEl.textContent = msg.data.goalTitle;
                }
                this.updateUI(this.currentCount, true);
            }
            if (msg.type === 'dock:testEvent' && msg.data && msg.data.event === 'follow') {
                this.currentCount += 1;
                this.updateUI(this.currentCount, true);
            }
        };

        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const bus = new BroadcastChannel('stream_master_dock_bus');
                bus.onmessage = (e) => handleDockMsg(e.data);
            } catch (e) {}
        }

        window.addEventListener('storage', (e) => {
            if (e.key === 'mithands_dock_event' && e.newValue) {
                try {
                    handleDockMsg(JSON.parse(e.newValue));
                } catch (err) {}
            }
        });

        window.addEventListener('message', (e) => {
            if (e.data && e.data.type) {
                handleDockMsg(e.data);
            }
        });
    }

    setupCustomTexts() {
        const titleEl = document.getElementById('goalTitle');
        const techIdEl = document.getElementById('techId');
        const targetEl = document.getElementById('targetCount');

        if (titleEl && this.config.TITLE) titleEl.textContent = this.config.TITLE;
        if (techIdEl && this.config.TECH_ID) techIdEl.textContent = this.config.TECH_ID;
        if (targetEl) targetEl.textContent = this.targetGoal;
    }

    async fetchTwitchFollowers() {
        let count = null;

        // Fuente 1: decapi.me (Rápida y directa de Twitch)
        try {
            const res = await fetch(`https://decapi.me/twitch/followcount/${this.channel}?t=${Date.now()}`);
            if (res.ok) {
                const text = await res.text();
                const parsed = parseInt(text.trim());
                if (!isNaN(parsed) && parsed > 0) {
                    count = parsed;
                }
            }
        } catch (e) {
            console.warn('Error fetching decapi.me followcount:', e);
        }

        // Fuente 2: api.ivr.fi (API directa de Twitch)
        if (count === null) {
            try {
                const res = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${this.channel}`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data[0] && typeof data[0].followers === 'number') {
                        count = data[0].followers;
                    }
                }
            } catch (e) {
                console.warn('Error fetching ivr.fi followers:', e);
            }
        }

        if (count !== null) {
            const hasChanged = count !== this.currentCount;
            this.currentCount = count;
            this.updateUI(count, hasChanged);
            localStorage.setItem('mithands_goal_followers', count.toString());
            this.setSyncStatus('ONLINE', '#00ff88');
        } else {
            this.setSyncStatus('CACHED', '#ff8c00');
        }
    }

    connectRealtime() {
        if (typeof io === 'undefined' || !this.token) {
            console.warn('Socket.io o Token no disponibles para tiempo real.');
            return;
        }

        try {
            this.socket = io('https://realtime.streamelements.com', {
                transports: ['websocket']
            });

            this.socket.on('connect', () => {
                console.log('⚡ Meta: Conectado a StreamElements WebSocket');
                this.socket.emit('authenticate', { method: 'jwt', token: this.token });
            });

            this.socket.on('authenticated', () => {
                console.log('✅ Meta: Autenticado en StreamElements');
            });

            // Escuchar nuevos seguidores en vivo
            this.socket.on('event', (eventData) => this.handleLiveEvent(eventData));
            this.socket.on('event:test', (eventData) => this.handleLiveEvent(eventData));
            this.socket.on('event:update', (eventData) => this.handleLiveEvent(eventData));

        } catch (err) {
            console.error('Error al inicializar WebSocket:', err);
        }
    }

    handleLiveEvent(eventData) {
        if (!eventData) return;
        const type = eventData.type || eventData.listener?.replace('-latest', '');

        if (type === 'follow' || type === 'follower') {
            console.log('🎉 ¡Nuevo seguidor recibido en tiempo real!', eventData);
            // Incrementar contador y forzar animación
            this.currentCount += 1;
            this.updateUI(this.currentCount, true);
            localStorage.setItem('mithands_goal_followers', this.currentCount.toString());

            // Re-sincronizar con Twitch tras 5 segundos para confirmar cifra oficial
            setTimeout(() => this.fetchTwitchFollowers(), 5000);
        }
    }

    updateUI(current, triggerGlitch = false) {
        const currentEl = document.getElementById('currentCount');
        const targetEl = document.getElementById('targetCount');
        const percentEl = document.getElementById('percentBadge');
        const fillEl = document.getElementById('progressFill');
        const remainingEl = document.getElementById('remainingCount');
        const cardEl = document.getElementById('goalCard');

        if (!currentEl || !targetEl || !fillEl) return;

        const target = this.targetGoal;
        const remaining = Math.max(0, target - current);
        const percent = Math.min(100, Math.max(0, (current / target) * 100));

        currentEl.textContent = current;
        targetEl.textContent = target;
        if (remainingEl) remainingEl.textContent = remaining;

        if (percentEl) {
            percentEl.textContent = `${Math.round(percent)}%`;
        }

        // Actualizar barra
        fillEl.style.width = `${percent.toFixed(1)}%`;

        // Estado completado
        if (cardEl) {
            if (current >= target) {
                cardEl.classList.add('completed');
            } else {
                cardEl.classList.remove('completed');
            }

            // Animación de impacto en vivo
            if (triggerGlitch) {
                cardEl.classList.remove('updating');
                void cardEl.offsetWidth; // Reflow
                cardEl.classList.add('updating');
                setTimeout(() => cardEl.classList.remove('updating'), 800);
            }
        }
    }

    setSyncStatus(status, color) {
        const syncEl = document.getElementById('syncStatus');
        if (syncEl) {
            syncEl.textContent = status;
            if (color) syncEl.style.color = color;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.GOAL_WIDGET = new StreamGoalWidget(typeof CONFIG !== 'undefined' ? CONFIG : {});
    window.GOAL_WIDGET.init();
});
