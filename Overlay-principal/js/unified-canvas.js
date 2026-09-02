/**
 * Unified Canvas Controller (1920x1080)
 * Controla y sincroniza todos los slots de widgets de Overlay-principal en una sola fuente de OBS
 */

class UnifiedCanvasController {
    constructor() {
        this.STORAGE_KEY = 'mithands_master_dock_state_v1';
        this.CHANNEL_NAME = 'stream_master_dock_bus';
        this.slots = {
            chat: document.getElementById('slot-chat'),
            metas: document.getElementById('slot-metas'),
            seguidores: document.getElementById('slot-seguidores'),
            votacion: document.getElementById('slot-votacion'),
            tts: document.getElementById('slot-tts'),
            logros: document.getElementById('slot-logros')
        };

        this.calibrationTimers = {};

        this.init();
    }

    init() {
        // 1. Conectar con el Master Control Dock vía BroadcastChannel (0 ms)
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.bus = new BroadcastChannel(this.CHANNEL_NAME);
                this.bus.onmessage = (e) => this.handleDockMessage(e.data);
                console.log('📡 Unified Canvas conectado al Master Control Dock');
            } catch (err) {
                console.warn('Unified Canvas: BroadcastChannel error:', err);
            }
        }

        // 2. Escuchar Storage Event (Fallback multi-proceso de OBS)
        window.addEventListener('storage', (e) => {
            if (e.key === 'mithands_dock_event' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    this.handleDockMessage(parsed);
                } catch (err) {}
            }
        });

        // 3. Escuchar postMessage directo (desde ventanas maestras o sub-frames)
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type) {
                this.handleDockMessage(e.data);
            }
        });

        // 4. Notificar a la ventana maestra si fue abierta como popup
        if (window.opener) {
            try {
                window.opener.postMessage({ type: 'dock:overlayReady' }, '*');
            } catch (e) {}
        }

        // 5. Cargar estado persistido
        this.loadState();
    }

    loadState() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const state = JSON.parse(saved);
                this.syncAll(state);
            }
        } catch (e) {
            console.error('Error al cargar estado en Unified Canvas:', e);
        }
    }

    handleDockMessage(payload) {
        if (!payload || !payload.type) return;

        // Reenviar mensaje a todos los iframes hijos de inmediato
        this.forwardToFrames(payload);

        switch (payload.type) {
            case 'dock:transform':
                if (payload.data && payload.data.widgetId) {
                    this.applyTransform(payload.data.widgetId, payload.data, true);
                }
                break;

            case 'dock:visibility':
                if (payload.data && payload.data.widgetId) {
                    this.applyVisibility(payload.data.widgetId, payload.data.visible);
                }
                break;

            case 'dock:cinematic':
                if (payload.data) {
                    this.applyCinematicMode(payload.data.active);
                }
                break;

            case 'dock:syncAll':
                if (payload.data) {
                    this.syncAll(payload.data);
                }
                break;
        }
    }

    forwardToFrames(payload) {
        Object.values(this.slots).forEach(slot => {
            if (slot && slot.contentWindow) {
                try {
                    slot.contentWindow.postMessage(payload, '*');
                } catch (err) {}
            }
        });
    }

    applyTransform(widgetId, data, triggerCalibration = false) {
        const slot = this.slots[widgetId];
        if (!slot) return;

        const x = data.x !== undefined ? data.x : 0;
        const y = data.y !== undefined ? data.y : 0;
        const scale = data.scale !== undefined ? data.scale / 100 : 1;
        const opacity = data.opacity !== undefined ? data.opacity / 100 : 1;
        const visible = data.visible !== false;

        slot.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        slot.style.opacity = visible ? opacity : '0';
        slot.style.pointerEvents = visible ? 'auto' : 'none';

        if (triggerCalibration) {
            this.triggerCalibration(widgetId);
        }
    }

    triggerCalibration(widgetId) {
        const slot = this.slots[widgetId];
        if (!slot) return;

        // 1. Añadir clase visual de calibración
        slot.classList.add('widget-calibrating');

        // 2. Notificar al iframe hijo que active la vista previa
        try {
            if (slot.contentWindow) {
                slot.contentWindow.postMessage({ type: 'widget:calibrationPreview', active: true, widgetId }, '*');
            }
        } catch (e) {}

        // 3. Reiniciar temporizador de 6 segundos
        if (this.calibrationTimers[widgetId]) {
            clearTimeout(this.calibrationTimers[widgetId]);
        }

        this.calibrationTimers[widgetId] = setTimeout(() => {
            slot.classList.remove('widget-calibrating');
            try {
                if (slot.contentWindow) {
                    slot.contentWindow.postMessage({ type: 'widget:calibrationPreview', active: false, widgetId }, '*');
                }
            } catch (e) {}
        }, 6000);
    }

    applyVisibility(widgetId, visible) {
        const slot = this.slots[widgetId];
        if (!slot) return;

        slot.style.opacity = visible ? '1' : '0';
        slot.style.pointerEvents = visible ? 'auto' : 'none';
    }

    applyCinematicMode(active) {
        const canvas = document.getElementById('master-canvas');
        if (canvas) {
            canvas.classList.toggle('cinematic-active', Boolean(active));
        }
    }

    syncAll(state) {
        if (!state) return;

        if (state.widgets) {
            Object.keys(state.widgets).forEach(wId => {
                this.applyTransform(wId, state.widgets[wId]);
            });
        }

        if (state.cinematicMode !== undefined) {
            this.applyCinematicMode(state.cinematicMode);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.unifiedCanvas = new UnifiedCanvasController();
});
