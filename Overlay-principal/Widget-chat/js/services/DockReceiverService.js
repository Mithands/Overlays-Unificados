import EventManager from '../utils/EventEmitter.js';

/**
 * DockReceiverService
 * Escucha las órdenes enviadas por el Master Control Dock de OBS a través de BroadcastChannel y LocalStorage
 */
export default class DockReceiverService {
    constructor(widgetId = 'chat') {
        this.widgetId = widgetId;
        this.CHANNEL_NAME = 'stream_master_dock_bus';
        this.bus = null;
        this.targetElement = null;

        this.init();
    }

    /**
     * Inicializa el receptor y busca el elemento contenedor principal
     */
    init() {
        // Encontrar el contenedor principal del widget
        this.targetElement = document.querySelector('.container-wrapper') || document.querySelector('.container') || document.body;

        // Configurar estilos de transición suave para transformaciones
        if (this.targetElement) {
            this.targetElement.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease';
            this.targetElement.style.transformOrigin = 'top left';
        }

        // 1. Escuchar BroadcastChannel (0 ms)
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.bus = new BroadcastChannel(this.CHANNEL_NAME);
                this.bus.onmessage = (e) => this.handleMessage(e.data);
                console.log('📡 DockReceiverService conectado vía BroadcastChannel');
            } catch (err) {
                console.warn('DockReceiver: BroadcastChannel no disponible:', err);
            }
        }

        // 2. Escuchar Storage Event (Fallback multi-pestaña / OBS)
        window.addEventListener('storage', (e) => {
            if (e.key === 'mithands_dock_event' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    this.handleMessage(parsed);
                } catch (err) {}
            }
        });

        // 3. Escuchar postMessage directo (cuando está dentro de un iframe)
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type) {
                this.handleMessage(e.data);
            }
        });

        // 4. Cargar estado inicial persistido
        this.loadSavedState();
    }

    /**
     * Carga y aplica el estado previo desde LocalStorage
     */
    loadSavedState() {
        try {
            const saved = localStorage.getItem('mithands_master_dock_state_v1');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.widgets && parsed.widgets[this.widgetId]) {
                    this.applyTransform(parsed.widgets[this.widgetId]);
                }
                if (parsed.cinematicMode !== undefined) {
                    this.applyCinematicMode(parsed.cinematicMode);
                }
            }
        } catch (e) {
            console.error('DockReceiver: Error al cargar estado previo:', e);
        }
    }

    /**
     * Procesa los mensajes recibidos del Dock
     * @param {Object} payload 
     */
    handleMessage(payload) {
        if (!payload || !payload.type) return;

        switch (payload.type) {
            case 'dock:transform':
                if (payload.data && payload.data.widgetId === this.widgetId) {
                    this.applyTransform(payload.data);
                }
                break;

            case 'dock:visibility':
                if (payload.data && payload.data.widgetId === this.widgetId) {
                    this.applyVisibility(payload.data.visible);
                }
                break;

            case 'dock:cinematic':
                if (payload.data) {
                    this.applyCinematicMode(payload.data.active);
                }
                break;

            case 'dock:syncAll':
                if (payload.data && payload.data.widgets && payload.data.widgets[this.widgetId]) {
                    this.applyTransform(payload.data.widgets[this.widgetId]);
                    if (payload.data.cinematicMode !== undefined) {
                        this.applyCinematicMode(payload.data.cinematicMode);
                    }
                }
                break;

            case 'dock:testEvent':
                this.handleTestEvent(payload.data);
                break;
        }
    }

    /**
     * Aplica coordenadas X, Y, Escala y Opacidad en vivo
     */
    applyTransform(data) {
        // Si está embebido en el lienzo unificado (iframe), el lienzo maneja la posición y escala
        if (window.self !== window.top) return;
        if (!this.targetElement) return;

        const x = data.x !== undefined ? data.x : 0;
        const y = data.y !== undefined ? data.y : 0;
        const scale = data.scale !== undefined ? data.scale / 100 : 1;
        const opacity = data.opacity !== undefined ? data.opacity / 100 : 1;
        const visible = data.visible !== false;

        this.targetElement.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        this.targetElement.style.opacity = visible ? opacity : '0';
        this.targetElement.style.pointerEvents = visible ? 'auto' : 'none';
    }

    /**
     * Muestra u oculta el widget
     */
    applyVisibility(visible) {
        if (window.self !== window.top) return;
        if (!this.targetElement) return;
        this.targetElement.style.opacity = visible ? '1' : '0';
        this.targetElement.style.pointerEvents = visible ? 'auto' : 'none';
    }

    /**
     * Activa o desactiva el Modo Cinemático
     */
    applyCinematicMode(active) {
        if (window.self !== window.top) return;
        if (!this.targetElement) return;
        if (active) {
            this.targetElement.style.opacity = '0';
            this.targetElement.style.pointerEvents = 'none';
        } else {
            this.loadSavedState(); // Restaurar opacidad previa
        }
    }

    /**
     * Maneja eventos de emulación y pruebas desde el Dock
     */
    handleTestEvent(data) {
        if (!data || !data.event) return;

        console.log('🧪 DockReceiver: Evento de prueba recibido:', data);

        switch (data.event) {
            case 'follow':
            case 'sub':
            case 'bits':
            case 'raid':
                EventManager.emit('ui:systemMessage', `🚨 [OBS DOCK TEST]: ${data.message}`);
                break;

            case 'levelup':
                EventManager.emit('user:levelUp', {
                    username: data.username,
                    newLevel: data.newLevel,
                    title: data.title,
                    totalXP: 5000,
                    timestamp: Date.now()
                });
                break;

            case 'achievement':
                EventManager.emit('user:achievementUnlocked', {
                    username: data.username,
                    achievement: data.achievement,
                    totalCount: 1,
                    isGlobal: true,
                    timestamp: Date.now()
                });
                break;
        }
    }
}
