/**
 * HistoryService - Automatiza el registro del historial de streams
 */
class HistoryService {
    constructor(config, gistService) {
        this.config = config;
        this.gistService = gistService;
        this.isTracking = false;
        this.sessionStartTime = null;
        this.offlineCounter = 0;
        this.MAX_OFFLINE_CHECKS = 5;
    }

    start() {
        console.log('📅 HistoryService: Iniciando monitoreo automático...');
        this.checkStream();
        setInterval(() => this.checkStream(), 60000); // Cada minuto
    }

    async checkStream() {
        const status = await this.getStreamInfo();

        // Si la API falló y no devolvió datos válidos, no modificamos el tracking para evitar falsos positivos
        if (!status.isValid) {
            return;
        }

        if (status.isOnline) {
            this.offlineCounter = 0;
            if (!this.isTracking) {
                console.log('🔴 Stream detectado (ON). Empezando tracking...');
                this.isTracking = true;
                this.sessionStartTime = Date.now();
            }
            // Guardar título y categoría de la sesión actual si son válidos
            if (status.title) this.currentTitle = status.title;
            if (status.category) this.currentCategory = status.category;
        } else if (this.isTracking) {
            this.offlineCounter++;
            console.log(`⚫ Stream OFF detectado (${this.offlineCounter}/${this.MAX_OFFLINE_CHECKS})`);
            
            if (this.offlineCounter >= this.MAX_OFFLINE_CHECKS) {
                console.log('🏁 Stream finalizado. Guardando en Historial-stream.json...');
                await this.saveCurrentSession();
                this.isTracking = false;
                this.sessionStartTime = null;
            }
        }
    }

    async getStreamInfo() {
        try {
            const [resUptime, resTitle, resGame] = await Promise.all([
                fetch(`https://decapi.me/twitch/uptime/${this.config.TWITCH_CHANNEL}`),
                fetch(`https://decapi.me/twitch/title/${this.config.TWITCH_CHANNEL}`),
                fetch(`https://decapi.me/twitch/game/${this.config.TWITCH_CHANNEL}`)
            ]);

            if (!resUptime.ok || !resTitle.ok || !resGame.ok) {
                return { isValid: false, isOnline: false };
            }

            const [uptime, title, game] = await Promise.all([
                resUptime.text(),
                resTitle.text(),
                resGame.text()
            ]);

            const isError = (text) => !text || 
                text.toLowerCase().includes('error') || 
                text.toLowerCase().includes('occurred') || 
                text.toLowerCase().includes('service unavailable') || 
                text.toLowerCase().includes('not found');

            if (isError(uptime) || isError(title) || isError(game)) {
                console.warn('⚠️ DecAPI devolvió un mensaje de error o datos inválidos:', { uptime, title, game });
                return { isValid: false, isOnline: false };
            }

            const isOffline = uptime.toLowerCase().includes('offline');

            return {
                isValid: true,
                isOnline: !isOffline,
                title: title.trim(),
                category: game.trim()
            };
        } catch (e) {
            console.error('Error al obtener info de Twitch:', e);
            return { isValid: false, isOnline: false };
        }
    }

    async saveCurrentSession() {
        if (!this.sessionStartTime) return;

        const duration = Math.floor((Date.now() - this.sessionStartTime) / 60000);
        if (duration < 1 && !this.config.DEBUG) return;

        // No guardar si el título es inválido o contiene error
        if (!this.currentTitle || this.currentTitle.toLowerCase().includes('error')) {
            console.warn('⚠️ Sesión descartada: el título no es válido ->', this.currentTitle);
            return;
        }

        const date = new Date().toISOString().split('T')[0];
        const history = await this.gistService.loadFile(this.config.FILENAME) || {};

        history[date] = {
            date: date,
            duration: (history[date]?.duration || 0) + duration,
            category: this.currentCategory || 'Varios',
            title: this.currentTitle,
            count: (history[date]?.count || 0) + 1
        };

        const success = await this.gistService.saveFile(this.config.FILENAME, history);
        if (success) {
            console.log('✅ Historial actualizado con éxito.');
            if (typeof loadRecentStreams === 'function') loadRecentStreams();
        }
    }
}
