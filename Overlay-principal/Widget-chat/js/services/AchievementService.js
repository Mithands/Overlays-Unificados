import { ACHIEVEMENTS_DATA } from '../../data/AchievementsData.js';
import EventManager from '../utils/EventEmitter.js';

/**
 * AchievementService - Sistema de Logros (Refactorizado)
 * 
 * Responsabilidades:
 * - Cargar definiciones de logros desde AchievementsData.js
 * - Evaluar reglas de logros dinámicamente
 * - Detectar cuándo se desbloquea un logro
 * - Guardar logros desbloqueados
 * - Emitir eventos de logro desbloqueado
 * 
 * REFACTORIZADO: Los logros ahora se definen en data/AchievementsData.js
 * en lugar de estar hardcodeados. Esto reduce el archivo de ~1150 a ~350 líneas
 * y permite añadir nuevos logros sin modificar esta lógica.
 * 
 * @class AchievementService
 */
export default class AchievementService {
    /**
     * Constructor del servicio de logros
     * @param {Object} config - Configuración global
     * @param {ExperienceService} experienceService - Servicio de XP
     */
    constructor(config, experienceService) {
        this.config = config;
        this.experienceService = experienceService;

        // Los logros se cargarán desde ACHIEVEMENTS_DATA
        this.achievements = {};
        this.isLoaded = false;

        // Cache de estadísticas adicionales por usuario
        this.userStats = new Map();

        // Categoría actual del stream (para logros de juegos específicos)
        this.currentStreamCategory = null;

        // Cargar logros desde el módulo global
        this._loadAchievementsFromModule();

        if (this.config.DEBUG) {
            console.log(`✅ AchievementService inicializado: ${Object.keys(this.achievements).length} logros definidos`);
        }

        // Suscribirse a eventos de stream
        EventManager.on('stream:statusChanged', (isOnline) => this.setStreamStatus(isOnline));
        EventManager.on('stream:categoryUpdated', (category) => this.setStreamCategory(category));
    }

    /**
     * Carga los logros desde el módulo ACHIEVEMENTS_DATA
     * @private
     */
    _loadAchievementsFromModule() {
        try {
            if (typeof ACHIEVEMENTS_DATA !== 'undefined' && ACHIEVEMENTS_DATA.achievements) {
                this._processAchievementData(ACHIEVEMENTS_DATA);
                this.isLoaded = true;
                console.log(`📦 Logros cargados desde AchievementsData.js: ${Object.keys(this.achievements).length}`);
            } else {
                console.warn('⚠️ ACHIEVEMENTS_DATA no encontrado, los logros no se cargarán');
                this.achievements = {};
            }
        } catch (e) {
            console.error('❌ Error cargando logros desde módulo:', e);
            this.achievements = {};
        }
    }

    /**
     * Procesa los datos del JSON y genera funciones check
     * @private
     * @param {Object} data - Datos del JSON
     */
    _processAchievementData(data) {
        const achievementEntries = data.achievements || {};

        for (const [id, achData] of Object.entries(achievementEntries)) {
            this.achievements[id] = {
                id: id,
                name: achData.name,
                description: achData.description,
                condition: achData.condition,
                category: achData.category,
                rarity: achData.rarity,
                // Si hay imagen especifica usi esa, sino usa default.png, ignoramos icono
                image: achData.image || 'img/logros/default.png',
                icon: null, // Ignoramos el icono original
                gameCategory: achData.gameCategory, // CATEGORÍA REQUERIDA (si existe)
                // Generar función check a partir de la regla
                check: this._createCheckFunction(achData.rule)
            };
        }
    }

    /**
     * Crea una función de verificación a partir de una regla JSON
     * @private
     * @param {Object} rule - { field, operator, value }
     * @returns {Function}
     */
    _createCheckFunction(rule) {
        if (!rule) {
            return () => false;
        }

        return (userData, stats) => {
            try {
                // Obtener el valor del campo
                const fieldValue = this._getFieldValue(rule.field, userData, stats);

                // Evaluar el operador
                return this._evaluateOperator(fieldValue, rule.operator, rule.value);
            } catch (e) {
                if (this.config.DEBUG) {
                    console.warn(`Error evaluando regla ${rule.field}:`, e);
                }
                return false;
            }
        };
    }

    /**
     * Obtiene el valor de un campo desde userData o stats
     * @private
     * @param {string} field - Path del campo (ej: "userData.totalMessages")
     * @param {Object} userData 
     * @param {Object} stats 
     * @returns {*}
     */
    _getFieldValue(field, userData, stats) {
        const parts = field.split('.');
        let obj;

        // Determinar el objeto raíz
        if (parts[0] === 'userData') {
            obj = userData;
            parts.shift();
        } else if (parts[0] === 'stats') {
            obj = stats;
            parts.shift();
        } else {
            return undefined;
        }

        // Navegar por el path
        for (const part of parts) {
            if (obj === undefined || obj === null) {
                return undefined;
            }
            obj = obj[part];
        }

        // Manejar valores por defecto
        if (obj === undefined || obj === null) {
            // Retornar valores por defecto según el tipo esperado
            if (field.includes('level')) return 1;
            if (field.includes('Count') || field.includes('Messages') || field.includes('Days')) return 0;
            if (field.includes('achievements')) return [];
            return 0;
        }

        return obj;
    }

    /**
     * Evalúa un operador de comparación
     * @private
     * @param {*} fieldValue 
     * @param {string} operator 
     * @param {*} targetValue 
     * @returns {boolean}
     */
    _evaluateOperator(fieldValue, operator, targetValue) {
        switch (operator) {
            case '>=':
                return (fieldValue || 0) >= targetValue;
            case '<=':
                return (fieldValue || 999) <= targetValue;
            case '>':
                return (fieldValue || 0) > targetValue;
            case '<':
                return (fieldValue || 999) < targetValue;
            case '==':
            case '===':
                return fieldValue === targetValue;
            case '!=':
            case '!==':
                return fieldValue !== targetValue;
            case 'includes':
                // Para arrays (como holidays)
                if (Array.isArray(fieldValue)) {
                    return fieldValue.includes(targetValue);
                }
                return false;
            default:
                console.warn(`Operador desconocido: ${operator}`);
                return false;
        }
    }

    /**
     * Obtiene o crea las estadísticas de un usuario
     * Sincroniza con userData.achievementStats del Gist
     * @param {string} username 
     * @returns {Object}
     */
    getUserStats(username) {
        const lowerUser = username.toLowerCase();

        // Si no está en cache, cargar desde userData (Gist)
        if (!this.userStats.has(lowerUser)) {
            const userData = this.experienceService.getUserData(lowerUser);
            const savedStats = userData.achievementStats || {};

            this.userStats.set(lowerUser, {
                // Mensajes
                firstMessageDays: savedStats.firstMessageDays || 0,
                messagesWithEmotes: savedStats.messagesWithEmotes || 0,
                mentionCount: savedStats.mentionCount || 0,
                nightMessages: savedStats.nightMessages || 0,
                ggCount: savedStats.ggCount || 0,
                earlyMorningMessages: savedStats.earlyMorningMessages || 0,

                // Rachas
                streakResets: savedStats.streakResets || 0,
                maxStreakLost: savedStats.maxStreakLost || 0,
                phoenixAchieved: savedStats.phoenixAchieved || false,

                // Niveles
                levelUpsToday: savedStats.levelUpsToday || 0,
                levelUpsThisWeek: savedStats.levelUpsThisWeek || 0,
                lastLevelUpDate: savedStats.lastLevelUpDate || null,
                lastLevelUpWeek: savedStats.lastLevelUpWeek || null,

                // XP Multiplicadores
                usedMultiplier15: savedStats.usedMultiplier15 || false,
                usedMultiplier2: savedStats.usedMultiplier2 || false,
                usedMultiplier3: savedStats.usedMultiplier3 || false,
                streakBonusCount: savedStats.streakBonusCount || 0,

                // Ranking
                bestRank: savedStats.bestRank || 999,
                currentRank: savedStats.currentRank || 999,
                daysInTop10: savedStats.daysInTop10 || 0,
                daysInTop15: savedStats.daysInTop15 || 0,
                daysAsTop1: savedStats.daysAsTop1 || 0,
                bestClimb: savedStats.bestClimb || 0,
                bestDailyClimb: savedStats.bestDailyClimb || 0,
                dethroned: savedStats.dethroned || false,
                comebacks: savedStats.comebacks || 0,
                rivalsDefeated: savedStats.rivalsDefeated || 0,

                // Stream
                firstHackCount: savedStats.firstHackCount || 0,
                streamOpenerCount: savedStats.streamOpenerCount || 0,
                liveMessages: savedStats.liveMessages || 0,
                offlineMessages: savedStats.offlineMessages || 0,
                marathonStreams: savedStats.marathonStreams || 0,
                uniqueStreams: savedStats.uniqueStreams || 0,
                primeTimeMessages: savedStats.primeTimeMessages || 0,

                // Festivos
                holidays: savedStats.holidays || [],

                // Game-specific message counters
                cyberpunk2077Messages: savedStats.cyberpunk2077Messages || 0,
                witcher3Messages: savedStats.witcher3Messages || 0,
                nightingaleMessages: savedStats.nightingaleMessages || 0,

                // Game-specific stream attendance
                witcher3Streams: savedStats.witcher3Streams || 0,
                lastWitcher3Date: savedStats.lastWitcher3Date || null
            });
        }

        return this.userStats.get(lowerUser);
    }

    /**
     * Actualiza estadísticas del usuario basado en el contexto del mensaje
     * @param {string} username 
     * @param {Object} context - Contexto del mensaje
     */
    updateUserStats(username, context = {}) {
        const lowerUser = username.toLowerCase();
        const stats = this.getUserStats(lowerUser);
        const now = new Date();

        // ===== MENSAJES =====
        if (context.isFirstMessageOfDay) {
            stats.firstMessageDays = (stats.firstMessageDays || 0) + 1;
        }

        if (context.hasEmotes) {
            stats.messagesWithEmotes = (stats.messagesWithEmotes || 0) + 1;
        }

        if (context.hasMention) {
            stats.mentionCount = (stats.mentionCount || 0) + 1;
        }

        // Mensaje nocturno (00:00 - 05:00)
        const hour = now.getHours();
        if (hour >= 0 && hour < 5) {
            stats.nightMessages = (stats.nightMessages || 0) + 1;
        }

        // Mensaje de trasnochador (04:00 - 06:00)
        if (hour >= 4 && hour < 6) {
            stats.earlyMorningMessages = (stats.earlyMorningMessages || 0) + 1;
        }

        // Contador de "GG"
        if (context.message && /\bgg\b/i.test(context.message)) {
            const matches = context.message.match(/\bgg\b/gi);
            if (matches && matches.length > 0) {
                stats.ggCount = (stats.ggCount || 0) + matches.length;
            }
        }

        // ===== XP MULTIPLICADORES =====
        if (context.streakMultiplier) {
            if (context.streakMultiplier >= 1.5) stats.usedMultiplier15 = true;
            if (context.streakMultiplier >= 2.0) stats.usedMultiplier2 = true;
            if (context.streakMultiplier >= 3.0) stats.usedMultiplier3 = true;
            if (context.streakMultiplier > 1.0) {
                stats.streakBonusCount = (stats.streakBonusCount || 0) + 1;
            }
        }

        // ===== STREAM =====
        if (context.isStreamLive) {
            stats.liveMessages = (stats.liveMessages || 0) + 1;

            if (context.isFirstHack) {
                stats.firstHackCount = (stats.firstHackCount || 0) + 1;
            }

            if (context.isStreamStart) {
                stats.streamOpenerCount = (stats.streamOpenerCount || 0) + 1;
            }

            // Prime time (19:00 - 23:00)
            if (hour >= 19 && hour < 23) {
                stats.primeTimeMessages = (stats.primeTimeMessages || 0) + 1;
            }
        } else {
            stats.offlineMessages = (stats.offlineMessages || 0) + 1;
        }

        // ===== FECHAS FESTIVAS =====
        this._updateHolidayStats(stats, now);

        // ===== GAME-SPECIFIC TRACKING =====
        // Priorizar categoría del contexto (manual/test) sobre la global del stream
        const activeCategory = context.category || (this.isStreamOnline ? this.currentStreamCategory : null);

        if (activeCategory) {
            const category = activeCategory.toLowerCase();

            // Cyberpunk 2077
            if (category.includes('cyberpunk 2077') || category === 'cyberpunk 2077') {
                stats.cyberpunk2077Messages = (stats.cyberpunk2077Messages || 0) + 1;
            }

            // The Witcher 3: Wild Hunt
            if (category.includes('witcher 3') || category.includes('the witcher 3')) {
                stats.witcher3Messages = (stats.witcher3Messages || 0) + 1;

                // Track attendance (Unique streams/days)
                const todayStr = now.toDateString();
                if (stats.lastWitcher3Date !== todayStr) {
                    stats.witcher3Streams = (stats.witcher3Streams || 0) + 1;
                    stats.lastWitcher3Date = todayStr;
                    if (this.config.DEBUG) {
                        console.log(`🐺 ${username} asistió a un nuevo directo de TW3. Total: ${stats.witcher3Streams}`);
                    }
                }
            }

            // Nightingale
            if (category.includes('nightingale')) {
                stats.nightingaleMessages = (stats.nightingaleMessages || 0) + 1;
            }

            // Rust
            if (category.includes('rust')) {
                stats.rustMessages = (stats.rustMessages || 0) + 1;
            }

            // Apex Legends
            if (category.includes('apex legends')) {
                stats.apexMessages = (stats.apexMessages || 0) + 1;
            }

            // SCUM
            if (category.includes('scum')) {
                stats.scumMessages = (stats.scumMessages || 0) + 1;
            }

            // Star Wars Outlaws
            if (category.includes('star wars outlaws')) {
                stats.starwarsMessages = (stats.starwarsMessages || 0) + 1;
            }

            // ARC Raiders
            if (category.includes('arc raiders')) {
                stats.arcraidersMessages = (stats.arcraidersMessages || 0) + 1;
            }

            // Minecraft
            if (category.includes('minecraft')) {
                stats.minecraftMessages = (stats.minecraftMessages || 0) + 1;
            }
        }

        this.userStats.set(lowerUser, stats);

        // Sincronizar con userData para guardar en Gist
        const userData = this.experienceService.getUserData(lowerUser);
        userData.achievementStats = stats;
    }

    /**
     * Actualiza estadísticas de fechas festivas
     * @private
     * @param {Object} stats 
     * @param {Date} now 
     */
    _updateHolidayStats(stats, now) {
        const month = now.getMonth() + 1; // 1-12
        const day = now.getDate();
        const hour = now.getHours();
        const dayOfWeek = now.getDay(); // 0 = Sunday

        if (!stats.holidays) stats.holidays = [];

        // Detectar fecha festiva
        const holidayChecks = [
            { condition: month === 1 && day === 1, key: 'new_year' },
            { condition: month === 2 && day === 14, key: 'valentines' },
            { condition: month === 3 && day === 21, key: 'spring' },
            { condition: month === 4 && day === 1, key: 'april_fools' },
            { condition: month === 6 && day === 21, key: 'summer' },
            { condition: month === 7 && day === 4, key: 'july4' },
            { condition: month === 10 && day === 31, key: 'halloween' },
            { condition: month === 11 && (day === 1 || day === 2), key: 'day_of_dead' },
            { condition: month === 12 && day === 24, key: 'christmas_eve' },
            { condition: month === 12 && day === 25, key: 'christmas' },
            { condition: month === 12 && day === 31, key: 'new_years_eve' },
            { condition: month === 2 && day === 29, key: 'leap_day' },
            { condition: dayOfWeek === 5 && day === 13, key: 'friday_13' }
        ];

        // Countdown de Año Nuevo (23:50 del 31 Dic a 00:10 del 1 Ene)
        if ((month === 12 && day === 31 && hour >= 23 && now.getMinutes() >= 50) ||
            (month === 1 && day === 1 && hour === 0 && now.getMinutes() <= 10)) {
            if (!stats.holidays.includes('countdown')) stats.holidays.push('countdown');
        }

        // Thanksgiving (4to jueves de Noviembre)
        if (month === 11 && dayOfWeek === 4) {
            const firstDayOfMonth = new Date(now.getFullYear(), 10, 1).getDay();
            const firstThursday = firstDayOfMonth <= 4 ? (5 - firstDayOfMonth) : (12 - firstDayOfMonth);
            const fourthThursday = firstThursday + 21;
            if (day >= fourthThursday && day < fourthThursday + 7) {
                if (!stats.holidays.includes('thanksgiving')) stats.holidays.push('thanksgiving');
            }
        }

        holidayChecks.forEach(({ condition, key }) => {
            if (condition && !stats.holidays.includes(key)) {
                stats.holidays.push(key);
            }
        });
    }

    /**
     * Obtiene el número de semana del año
     * @param {Date} date
     * @returns {number}
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Verifica y desbloquea logros para un usuario después de un mensaje
     * @param {string} username 
     * @param {Object} context - Contexto del mensaje
     * @returns {Array} Lista de logros desbloqueados
     */
    checkAchievements(username, context = {}) {
        const lowerUser = username.toLowerCase();

        // Actualizar estadísticas primero
        this.updateUserStats(lowerUser, context);

        // Obtener datos del usuario desde ExperienceService
        const userData = this.experienceService.getUserData(lowerUser);
        const userStats = this.getUserStats(lowerUser);

        // Lista de logros desbloqueados en esta verificación
        const unlockedNow = [];

        // Obtener logros ya desbloqueados (puede ser array de IDs o array de objetos)
        let existingAchievements = userData.achievements || [];

        // Normalizar: obtener lista de IDs ya desbloqueados
        const unlockedIds = existingAchievements.map(ach =>
            typeof ach === 'string' ? ach : ach.id
        );

        for (const [achievementId, achievement] of Object.entries(this.achievements)) {
            // Saltar si ya está desbloqueado
            if (unlockedIds.includes(achievementId)) continue;

            // Excluir al streamer del logro 'first_hack' (Primer mensaje)
            const isStreamer = lowerUser === (this.config.TWITCH_CHANNEL || 'mithands').toLowerCase() ||
                               lowerUser === 'mithands' ||
                               lowerUser === 'playmithttv';
            if (achievementId === 'first_hack' && isStreamer) {
                continue;
            }

            // Restricción por categoría de juego (Si el logro la tiene)
            if (achievement.gameCategory) {
                const activeCategory = context.category || (this.isStreamOnline ? this.currentStreamCategory : null);
                if (!activeCategory || !activeCategory.toLowerCase().includes(achievement.gameCategory.toLowerCase())) {
                    continue; // Saltar logro si no estamos en la categoría correcta
                }
            }

            // Verificar si cumple la condición
            try {
                if (achievement.check(userData, userStats)) {
                    // ¡Logro desbloqueado! Guardar con timestamp
                    const unlockedAchievement = {
                        id: achievementId,
                        unlockedAt: new Date().toISOString()
                    };

                    existingAchievements.push(unlockedAchievement);
                    unlockedNow.push(achievement);

                    if (this.config.DEBUG) {
                        console.log(`🏆 LOGRO DESBLOQUEADO: ${username} -> ${achievement.name}`);
                    }
                }
            } catch (error) {
                console.error(`Error verificando logro ${achievementId}:`, error);
            }
        }

        // Guardar logros actualizados si hay nuevos
        if (unlockedNow.length > 0) {
            userData.achievements = existingAchievements;
            this.experienceService.persistence.markDirty(lowerUser);

            // Emitir eventos para cada logro desbloqueado
            unlockedNow.forEach(achievement => {
                this.emitAchievementUnlocked(username, achievement);
            });
        }

        return unlockedNow;
    }

    onAchievementUnlocked(callback) {
        return EventManager.on('user:achievementUnlocked', callback);
    }

    emitAchievementUnlocked(username, achievement) {
        const payload = {
            username,
            achievement,
            timestamp: Date.now()
        };

        // 1. Evento interno de la app
        EventManager.emit('user:achievementUnlocked', payload);

        // 2. BroadcastChannel para sincronizar con Achievements-view.html u otras fuentes de OBS
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                const channel = new BroadcastChannel('mithands_achievements_channel');
                channel.postMessage({ type: 'achievement_unlocked', data: payload });
            }
        } catch (e) {
            console.warn('⚠️ BroadcastChannel no disponible:', e);
        }

        // 3. Fallback con localStorage para máxima compatibilidad
        try {
            localStorage.setItem('mithands_latest_achievement', JSON.stringify(payload));
        } catch (e) {
            // Ignorar errores de quota o sandbox
        }
    }

    /**
     * Obtiene los logros desbloqueados de un usuario
     * @param {string} username 
     * @returns {Array}
     */
    getUserAchievements(username) {
        const userData = this.experienceService.getUserData(username.toLowerCase());
        const achievementData = userData.achievements || [];

        // Normalize: handle both old format (string ID) and new format (object with id/unlockedAt)
        return achievementData.map(ach => {
            const id = typeof ach === 'string' ? ach : ach.id;
            const unlockedAt = typeof ach === 'object' ? ach.unlockedAt : null;
            const achievement = this.achievements[id];

            if (!achievement) return null;

            return {
                ...achievement,
                unlockedAt
            };
        }).filter(Boolean);
    }

    /**
     * Obtiene información de un logro por ID
     * @param {string} achievementId 
     * @returns {Object|null}
     */
    getAchievement(achievementId) {
        return this.achievements[achievementId] || null;
    }

    /**
     * Obtiene todos los logros de una categoría
     * @param {string} category 
     * @returns {Array}
     */
    getAchievementsByCategory(category) {
        return Object.values(this.achievements).filter(a => a.category === category);
    }

    /**
     * Carga estadísticas adicionales desde los datos del usuario
     * @param {string} username 
     * @param {Object} savedStats 
     */
    loadUserStats(username, savedStats) {
        if (savedStats) {
            this.userStats.set(username.toLowerCase(), savedStats);
        }
    }

    /**
     * Obtiene estadísticas para guardar en Gist
     * @param {string} username 
     * @returns {Object}
     */
    getStatsForSave(username) {
        return this.getUserStats(username);
    }

    /**
     * Obtiene el total de logros disponibles
     * @returns {number}
     */
    getTotalAchievements() {
        return Object.keys(this.achievements).length;
    }

    /**
     * Recarga los logros desde el JSON (útil para hot-reload)
     * @returns {Promise<void>}
     */
    async reloadAchievements() {
        await this.loadAchievementsAsync();
        console.log(`🔄 Logros recargados: ${Object.keys(this.achievements).length}`);
    }

    /**
     * Establece la categoría actual del stream
     * @param {string} category - Nombre de la categoría (juego)
     */
    setStreamCategory(category) {
        const previousCategory = this.currentStreamCategory;
        this.currentStreamCategory = category;

        if (this.config.DEBUG && previousCategory !== category) {
            console.log(`🎮 Stream category updated: ${previousCategory || 'none'} -> ${category || 'none'}`);
        }
    }

    /**
     * Obtiene la categoría actual del stream
     * @returns {string|null}
     */
    getStreamCategory() {
        return this.currentStreamCategory;
    }

    /**
     * Actualiza el estado online/offline del stream
     * @param {boolean} isOnline 
     */
    setStreamStatus(isOnline) {
        this.isStreamOnline = isOnline;
    }
}
