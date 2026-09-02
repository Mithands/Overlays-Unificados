import EventManager from '../utils/EventEmitter.js';

/**
 * AudioManager - Centralized Audio Management System
 * 
 * Unifies all sound logic (Chat, Level Up, Achievements) into a single manager.
 * Removes dependencies on scattered "AudioService" instances.
 */
export default class AudioManager {
    constructor(config) {
        this.config = config;

        // Cache for audio objects to avoid reloading
        this.audioCache = new Map();

        // Trackers for special first messages
        this.playedFirstMessageUsers = new Set();

        // Default sounds
        this.defaultSounds = {
            notification: this.config.AUDIO_URL || 'sounds/cyberpunk-message.mp3',
            achievement: 'sounds/logro.mp3'
        };

        this.initialized = false;

        // Cargar volumen guardado del Master Dock
        try {
            const saved = localStorage.getItem('mithands_master_dock_state_v1');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.audio && parsed.audio.chatSfxVolume !== undefined) {
                    this.config.AUDIO_VOLUME = (parseFloat(parsed.audio.chatSfxVolume) || 100) / 100;
                    if (parsed.audio.chatSfxMuted) this.config.AUDIO_VOLUME = 0;
                }
            }
        } catch (e) {}

        // Setup listeners
        this.init();
    }

    /**
     * Initialize listeners
     */
    init() {
        if (this.initialized) return;

        this._setupEventListeners();
        this._setupDockListeners();
        this.initialized = true;

        if (this.config.DEBUG) {
            console.log('🔊 AudioManager initialized and listening to events');
        }
    }

    _setupDockListeners() {
        const handleDockMsg = (msg) => {
            if (!msg || !msg.type) return;
            if ((msg.type === 'dock:sfxControl' || msg.type === 'dock:ttsControl') && msg.data) {
                if (msg.data.chatSfxVolume !== undefined) {
                    this.config.AUDIO_VOLUME = (parseFloat(msg.data.chatSfxVolume) || 0) / 100;
                }
                if (msg.data.chatSfxMuted !== undefined) {
                    if (msg.data.chatSfxMuted) this.config.AUDIO_VOLUME = 0;
                }
                if (msg.data.action === 'testChatSound') {
                    this.playChatMessage();
                }
            } else if (msg.type === 'dock:syncAll' && msg.data && msg.data.audio) {
                if (msg.data.audio.chatSfxVolume !== undefined) {
                    this.config.AUDIO_VOLUME = (parseFloat(msg.data.audio.chatSfxVolume) || 0) / 100;
                    if (msg.data.audio.chatSfxMuted) this.config.AUDIO_VOLUME = 0;
                }
            }
        };

        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const bus = new BroadcastChannel('stream_master_dock_bus');
                bus.onmessage = (event) => handleDockMsg(event.data);
            } catch (e) {}
        }

        window.addEventListener('storage', (e) => {
            if (e.key === 'mithands_dock_event' && e.newValue) {
                try {
                    handleDockMsg(JSON.parse(e.newValue));
                } catch (err) {}
            }
        });
    }

    _setupEventListeners() {
        // 1. Chat Message
        EventManager.on('chat:messageReceived', (data) => {
            const username = (data && data.username) ? data.username.toLowerCase() : '';

            this.playChatMessage();
        });

        // 2. Level Up (Data contains newLevel)
        EventManager.on('user:levelUp', (data) => this.playLevelUp(data));

        // 3. Achievement
        EventManager.on('user:achievementUnlocked', () => this.playAchievement());

        // 4. Test sound
        EventManager.on('test:sound', () => this.playChatMessage());

        // 6. Reset session on stream start
        EventManager.on('stream:statusChanged', (isOnline) => {
            if (isOnline) this.resetSession();
        });
    }

    /**
     * Resetea el flag del primer mensaje (por si se necesita reiniciar sesión)
     */
    resetSession() {
        this.playedFirstMessageUsers.clear();
    }



    /**
     * Plays the standard chat notification sound
     */
    playChatMessage() {
        this._playSoundFile(this.defaultSounds.notification);
    }

    /**
     * Plays a level up sound based on the level reached
     * @param {Object} data - Event data containing { newLevel }
     */
    playLevelUp(data) {
        const level = data && data.newLevel ? data.newLevel : 1;
        let soundFile = 'sounds/level10.mp3'; // Default

        // Select sound based on level tiers
        if (level <= 10) soundFile = 'sounds/level10.mp3';
        else if (level <= 15) soundFile = 'sounds/level15.mp3';
        else if (level <= 20) soundFile = 'sounds/level20.mp3';
        else soundFile = 'sounds/level25.mp3'; // 21+

        // Reducido un 75% (factor 0.25) para calibrarlo al gusto del usuario
        this._playSoundFile(soundFile, 0.25);
    }

    /**
     * Plays the achievement unlocked sound
     */
    playAchievement() {
        this._playSoundFile(this.defaultSounds.achievement);
    }

    /**
     * Internal method to play a sound file
     * @param {string} path - Path to audio file
     * @param {number} multiplier - Volume multiplier (default 1.0)
     */
    _playSoundFile(path, multiplier = 1.0) {
        // strict volume check (0 volume = mute)
        if (!this.config.AUDIO_VOLUME && this.config.AUDIO_VOLUME !== 0) return;

        try {
            const baseVol = Math.max(0, Math.min(1, this.config.AUDIO_VOLUME));
            const finalVol = Math.max(0, Math.min(1, baseVol * multiplier));
            if (finalVol <= 0) return;

            const audio = new Audio(path);
            audio.volume = finalVol; // Clamp 0-1

            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Browsers block autoplay without interaction
                    // We suppress the error to keep console clean, unless debugging
                    if (this.config.DEBUG) {
                        console.warn(`⚠️ AudioManager: Could not play ${path}`, error.message);
                    }
                });
            }
        } catch (e) {
            console.error('❌ AudioManager Error:', e);
        }
    }
}
