/**
 * Overlay Script Autónomo para OBS Studio con Soporte Completo Master Dock
 * Ejecuta el motor TTS y la conexión a Twitch de forma 100% autónoma en OBS,
 * totalmente sincronizado con el Master Control Dock.
 */

document.addEventListener('DOMContentLoaded', () => {
  const bubble = document.getElementById('ttsBubble');
  const usernameEl = document.getElementById('ttsUsername');
  const roleBadgeEl = document.getElementById('ttsRoleBadge');
  const messageEl = document.getElementById('ttsMessage');

  let hideTimeout = null;

  // 1. Instanciar Motor de Voz y Conexión de Twitch
  const tts = new TTSEngine();
  const twitch = new TwitchChatManager(tts);

  // 2. Cargar estado guardado inicial del Master Dock
  const CHANNEL_NAME = 'mithands';
  let audioState = {
    ttsVolume: 100,
    ttsRate: 1.0,
    ttsPitch: 1.0,
    ttsMuted: false,
    ttsEngine: 'native',
    ttsVoiceUri: '',
    ttsGoogleLang: 'es',
    ttsRequireCmd: true,
    ttsReadUser: true,
    ttsFilterUrls: true,
    ttsIgnoreBots: true,
    ttsCooldown: 5,
    ttsMaxChars: 200
  };

  try {
    const savedMaster = localStorage.getItem('mithands_master_dock_state_v1');
    if (savedMaster) {
      const parsed = JSON.parse(savedMaster);
      if (parsed.audio) {
        audioState = { ...audioState, ...parsed.audio };
      }
    }
  } catch (e) {
    console.warn('Error leyendo estado inicial TTS:', e);
  }

  function applyAudioConfig(state) {
    tts.updateSettings({
      engine: state.ttsEngine || 'native',
      voiceUri: state.ttsVoiceUri || '',
      lang: state.ttsEngine === 'google' ? (state.ttsGoogleLang || 'es') : 'es-ES',
      rate: parseFloat(state.ttsRate) || 1.0,
      pitch: parseFloat(state.ttsPitch) || 1.0,
      volume: Math.max(0, Math.min(1.0, (parseFloat(state.ttsVolume) || 100) / 100)),
      readUsername: state.ttsReadUser !== false,
      maxChars: parseInt(state.ttsMaxChars, 10) || 200,
      filterUrls: state.ttsFilterUrls !== false
    });
    tts.setMute(Boolean(state.ttsMuted));

    twitch.updateSettings({
      channel: CHANNEL_NAME,
      command: '!tts',
      requireCommand: state.ttsRequireCmd !== false,
      ignoreKnownBots: state.ttsIgnoreBots !== false,
      cooldown: parseInt(state.ttsCooldown, 10) || 5,
      maxChars: parseInt(state.ttsMaxChars, 10) || 200,
      filterUrls: state.ttsFilterUrls !== false
    });
  }

  applyAudioConfig(audioState);
  twitch.connect(CHANNEL_NAME);

  // 3. Notificar estado en vivo al Master Dock (0 ms)
  const masterBus = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('stream_master_dock_bus') : null;

  function broadcastLiveStatus(statusData) {
    const payload = {
      type: 'tts:liveStatus',
      data: statusData,
      timestamp: Date.now()
    };
    if (masterBus) {
      try { masterBus.postMessage(payload); } catch (e) {}
    }
    try {
      localStorage.setItem('mithands_dock_event', JSON.stringify(payload));
    } catch (e) {}
  }

  // 4. Mostrar y ocultar bocadillo visual cuando el motor hable
  function showTTSMessage(data) {
    if (hideTimeout) clearTimeout(hideTimeout);

    usernameEl.textContent = data.user || 'Anónimo';
    usernameEl.style.color = data.color || '#00f0ff';
    roleBadgeEl.textContent = (data.role || 'viewer').toUpperCase();
    messageEl.textContent = data.message || '';

    bubble.classList.add('visible');
  }

  function hideTTSMessage() {
    bubble.classList.remove('visible');
  }

  // Hook directo con el estado del motor TTS
  const originalNotify = tts.notifyOverlayState.bind(tts);
  tts.notifyOverlayState = (data) => {
    originalNotify(data);
    if (data) {
      showTTSMessage(data);
      broadcastLiveStatus({
        isPlaying: true,
        user: data.user,
        role: data.role,
        message: data.message,
        queueCount: tts.queue.length
      });
    } else {
      hideTTSMessage();
      broadcastLiveStatus({
        isPlaying: false,
        queueCount: tts.queue.length
      });
    }
  };

  tts.onQueueChanged = (queue, isPlaying) => {
    broadcastLiveStatus({
      isPlaying: isPlaying,
      queueCount: queue.length
    });
  };

  // 5. Escuchar comandos en tiempo real desde el Master Control Dock
  const processedEvents = new Set();
  function handleMasterDockMsg(msg) {
    if (!msg || !msg.type) return;

    // Deduplicación para evitar que el mismo evento se ejecute 3 veces por BroadcastChannel + Storage + PostMessage
    const eventKey = `${msg.type}_${msg.timestamp || ''}_${JSON.stringify(msg.data || '')}`;
    if (processedEvents.has(eventKey)) return;
    processedEvents.add(eventKey);
    if (processedEvents.size > 200) {
      const first = processedEvents.values().next().value;
      processedEvents.delete(first);
    }

    // Modo Calibración / Movimiento X/Y
    if (msg.type === 'widget:calibrationPreview') {
      if (msg.widgetId === 'tts') {
        if (msg.active) {
          showTTSMessage({
            user: 'Mithands',
            role: 'STREAMER',
            color: '#00f0ff',
            message: '🔊 [CALIBRACIÓN] Vista previa de bocadillo de voz'
          });
        } else {
          hideTTSMessage();
        }
      }
    } else if (msg.type === 'dock:transform' && msg.data && msg.data.widgetId === 'tts') {
      showTTSMessage({
        user: 'Mithands',
        role: 'STREAMER',
        color: '#00f0ff',
        message: '🔊 [CALIBRACIÓN] Vista previa de bocadillo de voz'
      });
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => hideTTSMessage(), 6000);
    } 
    // Controles de Audio y Voz
    else if (msg.type === 'dock:ttsControl' && msg.data) {
      const { action, volume, muted, text, audio } = msg.data;

      if (action === 'syncSettings' && audio) {
        audioState = { ...audioState, ...audio };
        applyAudioConfig(audioState);
      } else if (action === 'volume') {
        const targetVol = Math.max(0, Math.min(1.0, (parseFloat(volume) || 100) / 100));
        tts.updateSettings({ volume: targetVol });
      } else if (action === 'mute') {
        tts.setMute(Boolean(muted));
      } else if (action === 'skip') {
        tts.skipCurrent();
        hideTTSMessage();
      } else if (action === 'clearQueue') {
        tts.clearQueue();
        hideTTSMessage();
      } else if (action === 'test') {
        const testUser = (msg.data && (msg.data.user || msg.data.displayName || msg.data.username)) || 'Mithands Control';
        const testText = text || (msg.data && msg.data.text) || '¡Hola Mithands, la consola de audio y voz está lista!';
        tts.addToQueue({
          username: testUser,
          displayName: testUser,
          color: (msg.data && msg.data.color) || '#00f0ff',
          role: (msg.data && msg.data.role) || 'broadcaster',
          message: testText
        });
      }
    } else if (msg.type === 'dock:syncAll' && msg.data && msg.data.audio) {
      audioState = { ...audioState, ...msg.data.audio };
      applyAudioConfig(audioState);
    }
  }

  if (masterBus) {
    masterBus.onmessage = (event) => handleMasterDockMsg(event.data);
  }

  window.addEventListener('storage', (event) => {
    if (event.key === 'mithands_dock_event' && event.newValue) {
      try {
        handleMasterDockMsg(JSON.parse(event.newValue));
      } catch (e) {}
    }
  });

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type) {
      handleMasterDockMsg(event.data);
    }
  });
});
