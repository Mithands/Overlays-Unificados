/**
 * Master Control Dock JS (OBS Studio Dock)
 * Maneja el estado global, la comunicación ultra-rápida (0 ms) vía BroadcastChannel y LocalStorage
 */

class MasterDockController {
    constructor() {
        this.STORAGE_KEY = 'mithands_master_dock_state_v1';
        this.CHANNEL_NAME = 'stream_master_dock_bus';
        this.bus = null;

        // Estado por defecto
        this.state = {
            cinematicMode: false,
            selectedWidget: 'chat',
            widgets: {
                chat: { x: 1410, y: 200, scale: 100, opacity: 100, visible: true },
                metas: { x: 30, y: 30, scale: 100, opacity: 100, visible: true },
                seguidores: { x: 30, y: 850, scale: 100, opacity: 100, visible: true },
                votacion: { x: 40, y: 200, scale: 100, opacity: 100, visible: true },
                tts: { x: 1520, y: 30, scale: 100, opacity: 90, visible: true },
                logros: { x: 1280, y: 30, scale: 100, opacity: 100, visible: true }
            },
            goals: {
                followerGoal: 75,
                goalTitle: 'META DE SEGUIDORES'
            },
            voting: {
                name1: 'Mafia',
                name2: 'Mafia 2',
                name3: 'Uncharted'
            },
            customPresets: {
                preset1: null,
                preset2: null,
                preset3: null
            },
            audio: {
                chatSfxVolume: 100,
                chatSfxMuted: false,
                ttsVolume: 100,
                ttsRate: 1.0,
                ttsPitch: 1.0,
                ttsMuted: false,
                ttsEngine: 'google',
                ttsVoiceUri: '',
                ttsGoogleLang: 'es',
                ttsRequireCmd: true,
                ttsReadUser: true,
                ttsFilterUrls: true,
                ttsIgnoreBots: true,
                ttsCooldown: 5,
                ttsMaxChars: 200
            }
        };

        this.loadState();
        this.initDOM();
        this.initEvents();
        this.initIncomingBus();
        this.initTwitchChat();
        this.broadcastAll();
    }

    initTwitchChat() {
        if (typeof TwitchChatManager === 'undefined') return;

        this.twitchChat = new TwitchChatManager(null);
        this.twitchChat.onStatusChange = (status) => {
            const badge = document.getElementById('ttsTwitchStatusBadge');
            if (badge) {
                if (status === 'connected') {
                    badge.textContent = '🟢 CONECTADO';
                    badge.style.color = '#00ff96';
                    badge.style.borderColor = '#00ff96';
                } else if (status === 'connecting') {
                    badge.textContent = '🟡 CONECTANDO...';
                    badge.style.color = '#ffcc00';
                    badge.style.borderColor = '#ffcc00';
                } else {
                    badge.textContent = '🔴 DESCONECTADO';
                    badge.style.color = '#ff0055';
                    badge.style.borderColor = '#ff0055';
                }
            }
        };

        this.twitchChat.handleChatMessage = (data) => {
            this.processIncomingChatMessage(data);
        };

        this.twitchChat.connect('mithands');
    }

    processIncomingChatMessage(data) {
        if (!data) return;
        const { username, displayName, color, role, rawMessage } = data;
        const trimmed = (rawMessage || '').trim();
        const aud = this.state.audio || {};

        // 1. Mostrar visualmente en la tarjeta de reproducción del Dock
        const playingUser = document.getElementById('ttsPlayingUser');
        const playingMsg = document.getElementById('ttsPlayingMsg');
        if (playingUser) {
            playingUser.textContent = `💬 ${displayName || username} [${(role || 'viewer').toUpperCase()}]`;
            playingUser.style.color = 'var(--cyan)';
        }
        if (playingMsg) {
            playingMsg.textContent = `"${trimmed}"`;
        }

        // 2. Filtrar bots conocidos
        if (aud.ttsIgnoreBots !== false) {
            const botList = ['streamelements', 'nightbot', 'moobot', 'fossabot', 'wizebot', 'streamlabs', 'botisimo', 'soundalerts', 'sery_bot'];
            if (botList.includes(username.toLowerCase())) return;
        }

        // 3. Filtrar comandos de chat general
        if (trimmed.startsWith('!') || trimmed.startsWith('/') || trimmed.startsWith('.') || trimmed.startsWith('$') || trimmed.startsWith('?')) {
            if (!trimmed.toLowerCase().startsWith('!tts')) {
                return;
            }
        }

        let speechText = trimmed;
        if (aud.ttsRequireCmd !== false) {
            if (!speechText.toLowerCase().startsWith('!tts')) return;
            speechText = speechText.substring(4).trim();
        }

        if (!speechText) return;
        if (speechText.startsWith('!') || speechText.startsWith('/') || speechText.startsWith('.') || speechText.startsWith('$') || speechText.startsWith('?')) {
            return;
        }

        // 4. El overlay procesa los mensajes de Twitch directamente de forma autónoma.
        // El dock solo actualiza la tarjeta de monitorización visual.
    }

    /**
     * Carga el estado guardado de LocalStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = {
                    ...this.state,
                    ...parsed,
                    widgets: { ...this.state.widgets, ...(parsed.widgets || {}) },
                    goals: { ...this.state.goals, ...(parsed.goals || {}) },
                    voting: { ...this.state.voting, ...(parsed.voting || {}) },
                    customPresets: { ...this.state.customPresets, ...(parsed.customPresets || {}) },
                    audio: { ...this.state.audio, ...(parsed.audio || {}) }
                };
            }
        } catch (e) {
            console.error('Error al cargar estado del dock:', e);
        }
    }

    /**
     * Guarda el estado actual en LocalStorage
     */
    saveState() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {
            console.error('Error al guardar estado:', e);
        }
    }

    /**
     * Emite un mensaje al bus de comunicación
     */
    emit(type, data) {
        const payload = { type, data, timestamp: Date.now() };

        // 1. Ventana vinculada directa (100% infalible en navegador y file://)
        if (this.overlayWindow && !this.overlayWindow.closed) {
            try {
                this.overlayWindow.postMessage(payload, '*');
            } catch (e) {}
        }

        // 2. BroadcastChannel (0 ms)
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                if (!this.bus) this.bus = new BroadcastChannel(this.CHANNEL_NAME);
                this.bus.postMessage(payload);
            } catch (e) {
                console.warn('BroadcastChannel error:', e);
            }
        }

        // 3. LocalStorage Event (Fallback multi-proceso de OBS)
        try {
            localStorage.setItem('mithands_dock_event', JSON.stringify(payload));
        } catch (e) {}

        this.saveState();
    }

    initIncomingBus() {
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                if (!this.bus) this.bus = new BroadcastChannel(this.CHANNEL_NAME);
                this.bus.onmessage = (event) => this.handleIncomingMessage(event.data);
            } catch (e) {}
        }
        window.addEventListener('storage', (e) => {
            if (e.key === 'mithands_dock_event' && e.newValue) {
                try {
                    this.handleIncomingMessage(JSON.parse(e.newValue));
                } catch (err) {}
            }
        });
    }

    handleIncomingMessage(msg) {
        if (!msg || !msg.type) return;
        if (msg.type === 'tts:liveStatus' && msg.data) {
            const data = msg.data;
            const playingUser = document.getElementById('ttsPlayingUser');
            const playingMsg = document.getElementById('ttsPlayingMsg');
            const queueBadge = document.getElementById('ttsLiveQueueBadge');

            if (queueBadge) {
                queueBadge.textContent = `${data.queueCount || 0} EN COLA`;
            }

            if (data.isPlaying) {
                if (playingUser) {
                    playingUser.textContent = `🔊 EN VIVO: ${data.user || 'Usuario'} [${(data.role || 'viewer').toUpperCase()}]`;
                    playingUser.style.color = 'var(--cyan)';
                }
                if (playingMsg) {
                    playingMsg.textContent = `"${data.message || ''}"`;
                }
            } else {
                if (playingUser) {
                    playingUser.textContent = 'ESTADO: LISTO';
                    playingUser.style.color = 'var(--text-muted)';
                }
                if (playingMsg) {
                    playingMsg.textContent = 'Esperando mensajes del chat de Twitch...';
                }
            }
        } else if (msg.type === 'chat:message' && msg.data) {
            this.processIncomingChatMessage(msg.data);
        }
    }

    /**
     * Transmite todo el estado completo a las fuentes
     */
    broadcastAll() {
        this.emit('dock:syncAll', this.state);
    }

    /**
     * Inicializa los valores visuales del DOM desde el estado
     */
    initDOM() {
        // Actualizar selector de widget
        const widgetSelector = document.getElementById('widgetSelector');
        if (widgetSelector) widgetSelector.value = this.state.selectedWidget;

        // Actualizar sliders del widget activo
        this.updateSlidersFromWidget(this.state.selectedWidget);

        // Actualizar toggles de visibilidad
        Object.keys(this.state.widgets).forEach(wId => {
            const toggle = document.getElementById(`toggle_${wId}`);
            if (toggle && this.state.widgets[wId]) {
                toggle.checked = this.state.widgets[wId].visible !== false;
            }
        });

        // Actualizar Metas
        const goalTargetInput = document.getElementById('inputGoalTarget');
        const goalTitleInput = document.getElementById('inputGoalTitle');
        if (goalTargetInput) goalTargetInput.value = this.state.goals.followerGoal;
        if (goalTitleInput) goalTitleInput.value = this.state.goals.goalTitle;

        // Actualizar Votaciones
        const v1 = document.getElementById('voteName1');
        const v2 = document.getElementById('voteName2');
        const v3 = document.getElementById('voteName3');
        if (v1) v1.value = this.state.voting.name1 || 'Mafia';
        if (v2) v2.value = this.state.voting.name2 || 'Mafia 2';
        if (v3) v3.value = this.state.voting.name3 || 'Uncharted';

        // Actualizar Audio y TTS
        const aud = this.state.audio || {};
        const sChatSfx = document.getElementById('sliderChatSfxVolume');
        const tChatSfxMute = document.getElementById('toggle_chat_sfx_mute');
        if (sChatSfx) {
            sChatSfx.value = aud.chatSfxVolume !== undefined ? aud.chatSfxVolume : 100;
            const l = document.getElementById('valChatSfxVolume');
            if (l) l.textContent = `${sChatSfx.value}%`;
        }
        if (tChatSfxMute) tChatSfxMute.checked = Boolean(aud.chatSfxMuted);

        const sTts = document.getElementById('sliderTtsVolume');
        const sRate = document.getElementById('sliderTtsRate');
        const sPitch = document.getElementById('sliderTtsPitch');
        const tMute = document.getElementById('toggle_tts_mute');
        const selEngine = document.getElementById('selectTtsEngine');
        const selGoogleLang = document.getElementById('selectTtsGoogleLang');
        const tReqCmd = document.getElementById('toggle_tts_require_cmd');
        const tReadUser = document.getElementById('toggle_tts_read_user');
        const tFilterUrls = document.getElementById('toggle_tts_filter_urls');
        const tIgnoreBots = document.getElementById('toggle_tts_ignore_bots');
        const inCooldown = document.getElementById('inputTtsCooldown');
        const inMaxChars = document.getElementById('inputTtsMaxChars');

        if (sTts) {
            sTts.value = aud.ttsVolume !== undefined ? aud.ttsVolume : 100;
            const l = document.getElementById('valTtsVolume');
            if (l) l.textContent = `${sTts.value}%`;
        }
        if (sRate) {
            sRate.value = aud.ttsRate !== undefined ? aud.ttsRate : 1.0;
            const l = document.getElementById('valTtsRate');
            if (l) l.textContent = `${sRate.value}x`;
        }
        if (sPitch) {
            sPitch.value = aud.ttsPitch !== undefined ? aud.ttsPitch : 1.0;
            const l = document.getElementById('valTtsPitch');
            if (l) l.textContent = `${sPitch.value}`;
        }
        if (tMute) tMute.checked = Boolean(aud.ttsMuted);
        if (selEngine) {
            selEngine.value = aud.ttsEngine || 'native';
            this.toggleEngineUI(selEngine.value);
        }
        if (selGoogleLang) selGoogleLang.value = aud.ttsGoogleLang || 'es';
        if (tReqCmd) tReqCmd.checked = aud.ttsRequireCmd !== false;
        if (tReadUser) tReadUser.checked = aud.ttsReadUser !== false;
        if (tFilterUrls) tFilterUrls.checked = aud.ttsFilterUrls !== false;
        if (tIgnoreBots) tIgnoreBots.checked = aud.ttsIgnoreBots !== false;
        if (inCooldown) inCooldown.value = aud.ttsCooldown || 5;
        if (inMaxChars) inMaxChars.value = aud.ttsMaxChars || 200;

        this.initVoices();

        // Actualizar estado visual de slots guardados
        [1, 2, 3].forEach(slot => {
            const btnLoad = document.getElementById(`btnLoadPreset${slot}`);
            const isSaved = this.state.customPresets && this.state.customPresets[`preset${slot}`];
            if (btnLoad) {
                if (isSaved) {
                    btnLoad.style.borderColor = 'var(--neon-green, #00ff88)';
                    btnLoad.style.color = '#00ff88';
                } else {
                    btnLoad.style.borderColor = 'rgba(0,240,255,0.3)';
                    btnLoad.style.color = 'var(--cyan)';
                }
            }
        });

        // Actualizar botón cinemático
        const btnCinematic = document.getElementById('btnCinematic');
        if (btnCinematic && this.state.cinematicMode) {
            btnCinematic.classList.add('active');
        }
    }

    toggleEngineUI(engine) {
        const nativeWrap = document.getElementById('ttsNativeVoicesWrap');
        const googleWrap = document.getElementById('ttsGoogleLangWrap');
        const pitchGroup = document.getElementById('pitchGroup');

        if (engine === 'google') {
            if (nativeWrap) nativeWrap.style.display = 'none';
            if (googleWrap) googleWrap.style.display = 'block';
            if (pitchGroup) pitchGroup.style.display = 'none';
        } else {
            if (nativeWrap) nativeWrap.style.display = 'block';
            if (googleWrap) googleWrap.style.display = 'none';
            if (pitchGroup) pitchGroup.style.display = 'block';
        }
    }

    initVoices() {
        const selectVoice = document.getElementById('selectTtsVoice');
        if (!selectVoice) return;

        const populate = () => {
            if (!('speechSynthesis' in window)) return;
            const voices = window.speechSynthesis.getVoices();
            if (!voices || voices.length === 0) return;

            selectVoice.innerHTML = '';
            voices.forEach(voice => {
                const opt = document.createElement('option');
                opt.value = voice.voiceURI;
                opt.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — [Default]' : ''}`;
                if (this.state.audio && this.state.audio.ttsVoiceUri === voice.voiceURI) {
                    opt.selected = true;
                }
                selectVoice.appendChild(opt);
            });
        };

        populate();
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = populate;
        }
    }

    /**
     * Actualiza los sliders con las coordenadas del widget activo
     */
    updateSlidersFromWidget(wId) {
        const widget = this.state.widgets[wId] || { x: 0, y: 0, scale: 100, opacity: 100 };
        
        const sliderX = document.getElementById('sliderX');
        const sliderY = document.getElementById('sliderY');
        const numX = document.getElementById('numX');
        const numY = document.getElementById('numY');
        const sliderScale = document.getElementById('sliderScale');
        const sliderOpacity = document.getElementById('sliderOpacity');

        if (sliderX) sliderX.value = widget.x;
        if (numX) numX.value = widget.x;
        if (sliderY) sliderY.value = widget.y;
        if (numY) numY.value = widget.y;
        if (sliderScale) { sliderScale.value = widget.scale; document.getElementById('valScale').textContent = `${widget.scale}%`; }
        if (sliderOpacity) { sliderOpacity.value = widget.opacity; document.getElementById('valOpacity').textContent = `${widget.opacity}%`; }

        // Mostrar sección de volumen de sonidos exclusivamente cuando Chat esté seleccionado
        const chatSection = document.getElementById('chatSpecificSection');
        if (chatSection) {
            chatSection.style.display = (wId === 'chat') ? 'block' : 'none';
        }
    }

    /**
     * Enlaza todos los eventos de la interfaz
     */
    initEvents() {
        // 0. Botón de Apertura y Enlace Directo de Overlay
        const btnOpenLinked = document.getElementById('btnOpenLinkedOverlay');
        if (btnOpenLinked) {
            btnOpenLinked.addEventListener('click', () => {
                this.overlayWindow = window.open('index.html', 'MithandsLiveOverlay', 'width=1280,height=720');
                this.showToast('📺 Overlay en vivo vinculado');
                setTimeout(() => this.broadcastAll(), 800);
            });
        }

        // Escuchar cuando el overlay esté listo
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'dock:overlayReady') {
                this.broadcastAll();
            }
        });

        // 1. Pestañas de Navegación
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                const targetPanel = document.getElementById(`panel_${btn.dataset.tab}`);
                if (targetPanel) targetPanel.classList.add('active');
            });
        });

        // 2. Selector de Widget a Transformar
        const widgetSelector = document.getElementById('widgetSelector');
        if (widgetSelector) {
            widgetSelector.addEventListener('change', (e) => {
                this.state.selectedWidget = e.target.value;
                this.updateSlidersFromWidget(this.state.selectedWidget);
            });
        }

        // 3. Toggles de Visibilidad
        ['chat', 'metas', 'seguidores', 'votacion', 'tts', 'logros'].forEach(wId => {
            const toggle = document.getElementById(`toggle_${wId}`);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    if (!this.state.widgets[wId]) this.state.widgets[wId] = {};
                    this.state.widgets[wId].visible = e.target.checked;
                    this.emit('dock:visibility', { widgetId: wId, visible: e.target.checked });
                    this.showToast(`${wId.toUpperCase()}: ${e.target.checked ? 'VISIBLE' : 'OCULTO'}`);
                });
            }
        });

        // 4. Modo Cinemático (Limpieza Total)
        const btnCinematic = document.getElementById('btnCinematic');
        if (btnCinematic) {
            btnCinematic.addEventListener('click', () => {
                this.state.cinematicMode = !this.state.cinematicMode;
                btnCinematic.classList.toggle('active', this.state.cinematicMode);
                this.emit('dock:cinematic', { active: this.state.cinematicMode });
                this.showToast(this.state.cinematicMode ? '🎬 MODO CINEMÁTICO: ON' : '📺 MODO CINEMÁTICO: OFF');
            });
        }

        // 5. Sliders e Inputs de Transformación
        this.bindSliderWithInput('sliderX', 'numX', (val) => {
            const wId = this.state.selectedWidget;
            if (!this.state.widgets[wId]) this.state.widgets[wId] = {};
            this.state.widgets[wId].x = parseInt(val, 10);
            this.emit('dock:transform', { widgetId: wId, ...this.state.widgets[wId] });
        });

        this.bindSliderWithInput('sliderY', 'numY', (val) => {
            const wId = this.state.selectedWidget;
            if (!this.state.widgets[wId]) this.state.widgets[wId] = {};
            this.state.widgets[wId].y = parseInt(val, 10);
            this.emit('dock:transform', { widgetId: wId, ...this.state.widgets[wId] });
        });

        this.bindSlider('sliderScale', 'valScale', '%', (val) => {
            const wId = this.state.selectedWidget;
            if (!this.state.widgets[wId]) this.state.widgets[wId] = {};
            this.state.widgets[wId].scale = parseInt(val, 10);
            this.emit('dock:transform', { widgetId: wId, ...this.state.widgets[wId] });
        });

        this.bindSlider('sliderOpacity', 'valOpacity', '%', (val) => {
            const wId = this.state.selectedWidget;
            if (!this.state.widgets[wId]) this.state.widgets[wId] = {};
            this.state.widgets[wId].opacity = parseInt(val, 10);
            this.emit('dock:transform', { widgetId: wId, ...this.state.widgets[wId] });
        });

        // Botones de Micro-Paso
        document.querySelectorAll('.btn-step').forEach(btn => {
            btn.addEventListener('click', () => {
                const axis = btn.dataset.axis;
                const step = parseInt(btn.dataset.step, 10) || 0;
                const wId = this.state.selectedWidget;
                if (!this.state.widgets[wId]) this.state.widgets[wId] = {};

                if (axis === 'x') {
                    this.state.widgets[wId].x = (this.state.widgets[wId].x || 0) + step;
                    this.updateSlidersFromWidget(wId);
                    this.emit('dock:transform', { widgetId: wId, ...this.state.widgets[wId] });
                } else if (axis === 'y') {
                    this.state.widgets[wId].y = (this.state.widgets[wId].y || 0) + step;
                    this.updateSlidersFromWidget(wId);
                    this.emit('dock:transform', { widgetId: wId, ...this.state.widgets[wId] });
                }
            });
        });

        // 6. Anclajes Rápidos
        document.querySelectorAll('.btn-anchor').forEach(btn => {
            btn.addEventListener('click', () => {
                const anchor = btn.dataset.anchor;
                if (anchor) this.applyAnchor(anchor);
            });
        });

        // 7. Presets Personalizados (Slots P1, P2, P3)
        document.querySelectorAll('.btn-preset-load').forEach(btn => {
            btn.addEventListener('click', () => {
                const slot = btn.dataset.slot;
                if (slot) this.loadCustomPreset(slot);
            });
        });

        document.querySelectorAll('.btn-preset-save').forEach(btn => {
            btn.addEventListener('click', () => {
                const slot = btn.dataset.slot;
                if (slot) this.saveCustomPreset(slot);
            });
        });

        // 8. Guardar Metas
        const btnSaveGoal = document.getElementById('btnSaveGoal');
        if (btnSaveGoal) {
            btnSaveGoal.addEventListener('click', () => {
                const target = parseInt(document.getElementById('inputGoalTarget').value, 10) || 75;
                const title = document.getElementById('inputGoalTitle').value.trim() || 'META DE SEGUIDORES';
                this.state.goals = { followerGoal: target, goalTitle: title };
                this.emit('dock:goalUpdate', this.state.goals);
                this.showToast('🎯 Metas actualizadas en vivo');
            });
        }

        const btnAddFollower = document.getElementById('btnAddFollower');
        if (btnAddFollower) {
            btnAddFollower.addEventListener('click', () => {
                this.emit('dock:testEvent', { event: 'follow', username: 'NuevoSeguidor' });
                this.showToast('➕ +1 Seguidor sumado a la meta');
            });
        }

        // 9. Votaciones de Juegos
        const btnSaveVotes = document.getElementById('btnSaveVotes');
        if (btnSaveVotes) {
            btnSaveVotes.addEventListener('click', () => {
                const n1 = document.getElementById('voteName1').value.trim() || 'Mafia';
                const n2 = document.getElementById('voteName2').value.trim() || 'Mafia 2';
                const n3 = document.getElementById('voteName3').value.trim() || 'Uncharted';
                this.state.voting = { name1: n1, name2: n2, name3: n3 };
                this.emit('dock:voteUpdate', {
                    options: {
                        mafia: { name: n1 },
                        mafia2: { name: n2 },
                        uncharted: { name: n3 }
                    }
                });
                this.showToast('🗳️ Títulos de votación guardados');
            });
        }

        const btnVote1 = document.getElementById('btnVote1');
        const btnVote2 = document.getElementById('btnVote2');
        const btnVote3 = document.getElementById('btnVote3');
        if (btnVote1) btnVote1.addEventListener('click', () => { this.emit('dock:voteAdd', { gameKey: 'mafia' }); this.showToast('➕ +1 Voto Opción 1'); });
        if (btnVote2) btnVote2.addEventListener('click', () => { this.emit('dock:voteAdd', { gameKey: 'mafia2' }); this.showToast('➕ +1 Voto Opción 2'); });
        if (btnVote3) btnVote3.addEventListener('click', () => { this.emit('dock:voteAdd', { gameKey: 'uncharted' }); this.showToast('➕ +1 Voto Opción 3'); });

        const btnResetVotes = document.getElementById('btnResetVotes');
        if (btnResetVotes) {
            btnResetVotes.addEventListener('click', () => {
                this.emit('dock:voteReset', {});
                this.showToast('🔄 Votación reiniciada a 0');
            });
        }

        // 10. Audio & TTS Migrado al Completo
        this.bindSlider('sliderChatSfxVolume', 'valChatSfxVolume', '%', (val) => {
            this.state.audio.chatSfxVolume = parseInt(val, 10);
            this.emit('dock:sfxControl', {
                action: 'syncSettings',
                chatSfxVolume: this.state.audio.chatSfxVolume,
                chatSfxMuted: this.state.audio.chatSfxMuted
            });
        });

        const toggleChatSfxMute = document.getElementById('toggle_chat_sfx_mute');
        if (toggleChatSfxMute) {
            toggleChatSfxMute.addEventListener('change', (e) => {
                this.state.audio.chatSfxMuted = e.target.checked;
                this.emit('dock:sfxControl', {
                    action: 'syncSettings',
                    chatSfxVolume: this.state.audio.chatSfxVolume,
                    chatSfxMuted: this.state.audio.chatSfxMuted
                });
                this.showToast(e.target.checked ? '🔇 SONIDOS DE CHAT SILENCIADOS' : '🔊 SONIDOS DE CHAT ACTIVADOS');
            });
        }

        const btnTestChatSound = document.getElementById('btnTestChatSound');
        if (btnTestChatSound) {
            btnTestChatSound.addEventListener('click', () => {
                this.emit('dock:sfxControl', {
                    action: 'testChatSound',
                    chatSfxVolume: this.state.audio.chatSfxVolume,
                    chatSfxMuted: this.state.audio.chatSfxMuted
                });

                // Reproducción en el propio panel para verificación instantánea
                try {
                    if (!this.state.audio.chatSfxMuted) {
                        const sfx = new Audio('Widget-chat/sounds/cyberpunk-message.mp3');
                        sfx.volume = Math.max(0, Math.min(1, (this.state.audio.chatSfxVolume !== undefined ? this.state.audio.chatSfxVolume : 100) / 100));
                        sfx.play().catch(() => {});
                    }
                } catch (e) {}

                this.showToast('🔔 Sonido de chat probado');
            });
        }

        this.bindSlider('sliderTtsVolume', 'valTtsVolume', '%', (val) => {
            this.state.audio.ttsVolume = parseInt(val, 10);
            this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
        });

        this.bindSlider('sliderTtsRate', 'valTtsRate', 'x', (val) => {
            this.state.audio.ttsRate = parseFloat(val);
            this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
        });

        this.bindSlider('sliderTtsPitch', 'valTtsPitch', '', (val) => {
            this.state.audio.ttsPitch = parseFloat(val);
            this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
        });

        const toggleTtsMute = document.getElementById('toggle_tts_mute');
        if (toggleTtsMute) {
            toggleTtsMute.addEventListener('change', (e) => {
                this.state.audio.ttsMuted = e.target.checked;
                this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
                this.showToast(e.target.checked ? '🔇 TTS SILENCIADO' : '🔊 TTS ACTIVADO');
            });
        }

        const selEngine = document.getElementById('selectTtsEngine');
        if (selEngine) {
            selEngine.addEventListener('change', (e) => {
                this.state.audio.ttsEngine = e.target.value;
                this.toggleEngineUI(e.target.value);
                this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
            });
        }

        const selVoice = document.getElementById('selectTtsVoice');
        if (selVoice) {
            selVoice.addEventListener('change', (e) => {
                this.state.audio.ttsVoiceUri = e.target.value;
                this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
            });
        }

        const selGoogleLang = document.getElementById('selectTtsGoogleLang');
        if (selGoogleLang) {
            selGoogleLang.addEventListener('change', (e) => {
                this.state.audio.ttsGoogleLang = e.target.value;
                this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
            });
        }

        const tReqCmd = document.getElementById('toggle_tts_require_cmd');
        if (tReqCmd) {
            tReqCmd.addEventListener('change', (e) => {
                this.state.audio.ttsRequireCmd = e.target.checked;
                this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
            });
        }

        const tReadUser = document.getElementById('toggle_tts_read_user');
        if (tReadUser) {
            tReadUser.addEventListener('change', (e) => {
                this.state.audio.ttsReadUser = e.target.checked;
                this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
            });
        }

        const tFilterUrls = document.getElementById('toggle_tts_filter_urls');
        if (tFilterUrls) {
            tFilterUrls.addEventListener('change', (e) => {
                this.state.audio.ttsFilterUrls = e.target.checked;
                this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
            });
        }

        const tIgnoreBots = document.getElementById('toggle_tts_ignore_bots');
        if (tIgnoreBots) {
            tIgnoreBots.addEventListener('change', (e) => {
                this.state.audio.ttsIgnoreBots = e.target.checked;
                this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
            });
        }

        const inCooldown = document.getElementById('inputTtsCooldown');
        if (inCooldown) {
            inCooldown.addEventListener('input', (e) => {
                this.state.audio.ttsCooldown = parseInt(e.target.value, 10) || 5;
                this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
            });
        }

        const inMaxChars = document.getElementById('inputTtsMaxChars');
        if (inMaxChars) {
            inMaxChars.addEventListener('input', (e) => {
                this.state.audio.ttsMaxChars = parseInt(e.target.value, 10) || 200;
                this.emit('dock:ttsControl', { action: 'syncSettings', audio: this.state.audio });
            });
        }

        const btnSkipTts = document.getElementById('btnSkipTts');
        if (btnSkipTts) {
            btnSkipTts.addEventListener('click', () => {
                this.emit('dock:ttsControl', { action: 'skip' });
                this.showToast('⏭️ Mensaje de voz saltado');
            });
        }

        const btnClearQueueTts = document.getElementById('btnClearQueueTts');
        if (btnClearQueueTts) {
            btnClearQueueTts.addEventListener('click', () => {
                this.emit('dock:ttsControl', { action: 'clearQueue' });
                this.showToast('🗑️ Cola de voz vaciada');
            });
        }

        const btnSendCustomTts = document.getElementById('btnSendCustomTts');
        const inputCustomTtsText = document.getElementById('inputCustomTtsText');
        if (btnSendCustomTts) {
            const sendCustom = () => {
                const text = (inputCustomTtsText && inputCustomTtsText.value.trim()) || '¡Hola Mithands, la consola de audio está activa!';
                this.emit('dock:ttsControl', {
                    action: 'test',
                    text: text,
                    user: 'Mithands Control',
                    role: 'broadcaster',
                    color: '#00f0ff'
                });

                // Reproducción de prueba en el propio dock para verificación instantánea
                try {
                    if (!this.state.audio.ttsMuted) {
                        if (this.state.audio.ttsEngine === 'google') {
                            const lang = this.state.audio.ttsGoogleLang || 'es';
                            const encoded = encodeURIComponent(text);
                            const audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`);
                            audio.volume = Math.max(0, Math.min(1.0, (parseFloat(this.state.audio.ttsVolume) || 100) / 100));
                            audio.play().catch(() => {});
                        } else if ('speechSynthesis' in window) {
                            const utt = new SpeechSynthesisUtterance(text);
                            utt.volume = Math.max(0, Math.min(1.0, (parseFloat(this.state.audio.ttsVolume) || 100) / 100));
                            utt.rate = parseFloat(this.state.audio.ttsRate) || 1.0;
                            utt.pitch = parseFloat(this.state.audio.ttsPitch) || 1.0;
                            if (this.state.audio.ttsVoiceUri) {
                                const voices = window.speechSynthesis.getVoices();
                                const v = voices.find(vox => vox.voiceURI === this.state.audio.ttsVoiceUri);
                                if (v) utt.voice = v;
                            }
                            window.speechSynthesis.speak(utt);
                        }
                    }
                } catch (e) {}

                this.showToast('🗣️ Mensaje TTS enviado a reproducir');
                if (inputCustomTtsText) inputCustomTtsText.value = '';
            };
            btnSendCustomTts.addEventListener('click', sendCustom);
            if (inputCustomTtsText) {
                inputCustomTtsText.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') sendCustom();
                });
            }
        }

        // 11. Botones de Pruebas Rápidas
        document.querySelectorAll('[data-test]').forEach(btn => {
            btn.addEventListener('click', () => {
                const testType = btn.dataset.test;
                this.triggerTest(testType);
            });
        });
    }

    bindSlider(sliderId, labelId, unit, callback) {
        const slider = document.getElementById(sliderId);
        const label = document.getElementById(labelId);
        if (slider && label) {
            slider.addEventListener('input', (e) => {
                const val = e.target.value;
                label.textContent = `${val}${unit}`;
                callback(val);
            });
        }
    }

    bindSliderWithInput(sliderId, numId, callback) {
        const slider = document.getElementById(sliderId);
        const num = document.getElementById(numId);

        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = e.target.value;
                if (num) num.value = val;
                callback(val);
            });
        }

        if (num) {
            num.addEventListener('input', (e) => {
                const val = e.target.value;
                if (slider) slider.value = val;
                callback(val);
            });
        }
    }

    applyAnchor(anchor) {
        const wId = this.state.selectedWidget;
        if (!this.state.widgets[wId]) this.state.widgets[wId] = {};
        const w = this.state.widgets[wId];

        // Dimensiones estimadas por widget para esquinas perfectas en 1920x1080
        const dims = {
            chat: { w: 480, h: 850 },
            metas: { w: 520, h: 160 },
            seguidores: { w: 450, h: 200 },
            votacion: { w: 1000, h: 680 },
            tts: { w: 350, h: 120 },
            logros: { w: 600, h: 300 }
        }[wId] || { w: 400, h: 300 };

        const margin = 30;

        switch (anchor) {
            case 'top-left':
                w.x = margin;
                w.y = margin;
                break;
            case 'top-right':
                w.x = Math.max(0, 1920 - dims.w - margin);
                w.y = margin;
                break;
            case 'center':
                w.x = Math.max(0, Math.round((1920 - dims.w) / 2));
                w.y = Math.max(0, Math.round((1080 - dims.h) / 2));
                break;
            case 'bottom-left':
                w.x = margin;
                w.y = Math.max(0, 1080 - dims.h - margin);
                break;
            case 'bottom-right':
                w.x = Math.max(0, 1920 - dims.w - margin);
                w.y = Math.max(0, 1080 - dims.h - margin);
                break;
            case 'reset':
                if (wId === 'chat') { w.x = 1410; w.y = 200; }
                else if (wId === 'metas') { w.x = 30; w.y = 30; }
                else if (wId === 'seguidores') { w.x = 30; w.y = 850; }
                else if (wId === 'votacion') { w.x = 40; w.y = 200; }
                else if (wId === 'tts') { w.x = 1520; w.y = 30; }
                else if (wId === 'logros') { w.x = 1280; w.y = 30; }
                w.scale = 100;
                w.opacity = 100;
                break;
        }

        this.updateSlidersFromWidget(wId);
        this.emit('dock:transform', { widgetId: wId, ...w });
        this.showToast(`Anclaje aplicado: ${anchor.toUpperCase()}`);
    }

    saveCustomPreset(slot) {
        if (!this.state.customPresets) this.state.customPresets = {};
        this.state.customPresets[`preset${slot}`] = JSON.parse(JSON.stringify(this.state.widgets));
        this.saveState();

        const btnLoad = document.getElementById(`btnLoadPreset${slot}`);
        if (btnLoad) {
            btnLoad.style.borderColor = 'var(--neon-green, #00ff88)';
            btnLoad.style.color = '#00ff88';
        }

        this.showToast(`💾 Preset P${slot} guardado`);
    }

    loadCustomPreset(slot) {
        const saved = this.state.customPresets && this.state.customPresets[`preset${slot}`];
        if (!saved) {
            this.showToast(`⚠️ Preset P${slot} vacío. Pulsa 💾 para guardarlo primero.`);
            return;
        }

        this.state.widgets = JSON.parse(JSON.stringify(saved));
        this.updateSlidersFromWidget(this.state.selectedWidget);

        // Actualizar toggles de visibilidad
        Object.keys(this.state.widgets).forEach(wId => {
            const toggle = document.getElementById(`toggle_${wId}`);
            if (toggle && this.state.widgets[wId]) {
                toggle.checked = this.state.widgets[wId].visible !== false;
            }
        });

        this.saveState();
        this.broadcastAll();
        this.showToast(`⚡ Preset P${slot} cargado`);
    }

    triggerTest(type) {
        const events = {
            follow: { event: 'follow', message: '¡David_Mith se ha unido al canal! (+100 XP)' },
            sub: { event: 'sub', message: '¡Kiber_Net suscrito por 3 meses! (+500 XP)' },
            bits: { event: 'bits', message: '¡CyberSam ha enviado 100 Bits! (+100 XP)' },
            raid: { event: 'raid', message: '¡Incursión de NeoTokyo con 45 raiders! (+200 XP)' },
            levelup: { event: 'levelup', username: 'Mithands_Test', newLevel: 5, title: 'Hacker Cyberpunk' },
            achievement: { event: 'achievement', username: 'Mithands_Test', achievement: { name: 'First Blood', description: 'Primer mensaje del día', xp: 50, icon: '🩸' } }
        };

        const data = events[type];
        if (data) {
            this.emit('dock:testEvent', data);
            this.showToast(`🧪 Test disparado: ${type.toUpperCase()}`);
        }
    }

    showToast(msg) {
        const toast = document.getElementById('dockToast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.masterDock = new MasterDockController();
});
