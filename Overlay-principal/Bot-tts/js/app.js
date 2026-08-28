/**
 * App Controller - Orquestador de la Micro Interfaz para OBS
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Instanciar motores
  const tts = new TTSEngine();
  const twitch = new TwitchChatManager(tts);

  // 2. Elementos DOM
  const elements = {
    // Tabs
    tabs: document.querySelectorAll('.nav-tab'),
    tabContents: document.querySelectorAll('.tab-content'),

    // Header
    twitchStatusBadge: document.getElementById('twitchStatusBadge'),
    twitchStatusText: document.getElementById('twitchStatusText'),
    btnToggleMute: document.getElementById('btnToggleMute'),

    // Control Tab
    playerBox: document.getElementById('playerBox'),
    playerEmpty: document.getElementById('playerEmpty'),
    nowPlayingContent: document.getElementById('nowPlayingContent'),
    playingUserRole: document.getElementById('playingUserRole'),
    playingUsername: document.getElementById('playingUsername'),
    playingMessage: document.getElementById('playingMessage'),
    queueCounterBadge: document.getElementById('queueCounterBadge'),
    btnSkip: document.getElementById('btnSkip'),
    btnClearQueue: document.getElementById('btnClearQueue'),
    queueList: document.getElementById('queueList'),
    inputTestText: document.getElementById('inputTestText'),
    btnTestSpeak: document.getElementById('btnTestSpeak'),

    // Voice Tab
    selectTtsEngine: document.getElementById('selectTtsEngine'),
    nativeVoicesGroup: document.getElementById('nativeVoicesGroup'),
    selectVoice: document.getElementById('selectVoice'),
    googleLangGroup: document.getElementById('googleLangGroup'),
    selectGoogleLang: document.getElementById('selectGoogleLang'),
    rangeVolume: document.getElementById('rangeVolume'),
    valVolume: document.getElementById('valVolume'),
    rangeRate: document.getElementById('rangeRate'),
    valRate: document.getElementById('valRate'),
    rangePitch: document.getElementById('rangePitch'),
    valPitch: document.getElementById('valPitch'),
    pitchSliderGroup: document.getElementById('pitchSliderGroup'),
    chkReadUsername: document.getElementById('chkReadUsername'),
    inputUsernameTemplate: document.getElementById('inputUsernameTemplate'),
    usernameTemplateGroup: document.getElementById('usernameTemplateGroup'),

    // Twitch Tab
    inputTwitchChannel: document.getElementById('inputTwitchChannel'),
    btnConnectTwitch: document.getElementById('btnConnectTwitch'),
    chkRequireCommand: document.getElementById('chkRequireCommand'),
    commandInputGroup: document.getElementById('commandInputGroup'),
    inputTtsCommand: document.getElementById('inputTtsCommand'),
    roleAll: document.getElementById('roleAll'),
    roleSubs: document.getElementById('roleSubs'),
    roleVips: document.getElementById('roleVips'),
    roleMods: document.getElementById('roleMods'),
    inputCooldown: document.getElementById('inputCooldown'),
    inputMaxChars: document.getElementById('inputMaxChars'),
    chkFilterUrls: document.getElementById('chkFilterUrls'),
    chkIgnoreBots: document.getElementById('chkIgnoreBots'),
    inputIgnoredUsers: document.getElementById('inputIgnoredUsers'),
    inputBlacklist: document.getElementById('inputBlacklist'),

    // Footer
    btnCopyOverlayUrl: document.getElementById('btnCopyOverlayUrl')
  };

  // 3. Cargar configuración guardada
  const STORAGE_KEY = 'twitch_tts_obs_settings_v1';
  let appSettings = {
    channel: '',
    ttsEngine: 'native',
    voiceUri: '',
    googleLang: 'es',
    volume: 1.0,
    rate: 1.0,
    pitch: 1.0,
    readUsername: true,
    usernameTemplate: '{user} dice ',
    requireCommand: true,
    command: '!tts',
    ignoreKnownBots: true,
    ignoredUsers: '',
    allowedRoles: {
      all: true,
      subs: true,
      vips: true,
      mods: true,
      broadcaster: true
    },
    cooldown: 5,
    maxChars: 200,
    filterUrls: true,
    blacklist: ''
  };

  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        appSettings = { ...appSettings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('No se pudo cargar localStorage:', e);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appSettings));
    } catch (e) {
      console.warn('No se pudo guardar localStorage:', e);
    }
  }

  loadSettings();

  // 4. Aplicar configuración a la UI y los módulos
  function applySettingsToUI() {
    // Twitch
    elements.inputTwitchChannel.value = appSettings.channel || '';
    elements.chkRequireCommand.checked = appSettings.requireCommand;
    elements.commandInputGroup.style.display = appSettings.requireCommand ? 'flex' : 'none';
    elements.inputTtsCommand.value = appSettings.command;
    elements.roleAll.checked = appSettings.allowedRoles.all;
    elements.roleSubs.checked = appSettings.allowedRoles.subs;
    elements.roleVips.checked = appSettings.allowedRoles.vips;
    elements.roleMods.checked = appSettings.allowedRoles.mods;
    elements.inputCooldown.value = appSettings.cooldown;
    elements.inputMaxChars.value = appSettings.maxChars;
    elements.chkFilterUrls.checked = appSettings.filterUrls;
    elements.chkIgnoreBots.checked = appSettings.ignoreKnownBots !== false;
    elements.inputIgnoredUsers.value = appSettings.ignoredUsers || '';
    elements.inputBlacklist.value = appSettings.blacklist;

    // TTS
    elements.selectTtsEngine.value = appSettings.ttsEngine;
    toggleEngineUI(appSettings.ttsEngine);
    elements.selectGoogleLang.value = appSettings.googleLang;
    elements.rangeVolume.value = appSettings.volume;
    elements.valVolume.textContent = `${Math.round(appSettings.volume * 100)}%`;
    elements.rangeRate.value = appSettings.rate;
    elements.valRate.textContent = `${appSettings.rate}x`;
    elements.rangePitch.value = appSettings.pitch;
    elements.valPitch.textContent = appSettings.pitch;
    elements.chkReadUsername.checked = appSettings.readUsername;
    elements.usernameTemplateGroup.style.display = appSettings.readUsername ? 'flex' : 'none';
    elements.inputUsernameTemplate.value = appSettings.usernameTemplate;

    // Módulos
    updateModules();
  }

  function toggleEngineUI(engine) {
    if (engine === 'google') {
      elements.nativeVoicesGroup.style.display = 'none';
      elements.googleLangGroup.style.display = 'flex';
      elements.pitchSliderGroup.style.display = 'none';
    } else {
      elements.nativeVoicesGroup.style.display = 'flex';
      elements.googleLangGroup.style.display = 'none';
      elements.pitchSliderGroup.style.display = 'flex';
    }
  }

  function updateModules() {
    tts.updateSettings({
      engine: appSettings.ttsEngine,
      voiceUri: appSettings.voiceUri,
      lang: appSettings.ttsEngine === 'google' ? appSettings.googleLang : 'es-ES',
      rate: appSettings.rate,
      pitch: appSettings.pitch,
      volume: appSettings.volume,
      readUsername: appSettings.readUsername,
      usernameTemplate: appSettings.usernameTemplate,
      maxChars: appSettings.maxChars,
      filterUrls: appSettings.filterUrls
    });

    twitch.updateSettings({
      channel: appSettings.channel,
      command: appSettings.command,
      requireCommand: appSettings.requireCommand,
      ignoreKnownBots: appSettings.ignoreKnownBots !== false,
      allowedRoles: appSettings.allowedRoles,
      userCooldownSeconds: appSettings.cooldown
    });

    if (appSettings.ignoredUsers) {
      twitch.setIgnoredUsers(appSettings.ignoredUsers.split(','));
    } else {
      twitch.setIgnoredUsers([]);
    }

    if (appSettings.blacklist) {
      twitch.setBlacklist(appSettings.blacklist.split(','));
    } else {
      twitch.setBlacklist([]);
    }
  }

  // 5. Cargar Voces del Sistema
  tts.onVoicesLoaded = (voices) => {
    elements.selectVoice.innerHTML = '';

    if (!voices || voices.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Sin voces detectadas';
      elements.selectVoice.appendChild(opt);
      return;
    }

    // Ordenar: poner las voces en español primero, y priorizar voces 'Natural' / 'Online' si existen
    const sorted = [...voices].sort((a, b) => {
      const aIsEs = a.lang && a.lang.startsWith('es');
      const bIsEs = b.lang && b.lang.startsWith('es');
      if (aIsEs && !bIsEs) return -1;
      if (!aIsEs && bIsEs) return 1;

      const aIsNatural = (a.name || '').includes('Natural') || (a.name || '').includes('Online');
      const bIsNatural = (b.name || '').includes('Natural') || (b.name || '').includes('Online');
      if (aIsNatural && !bIsNatural) return -1;
      if (!aIsNatural && bIsNatural) return 1;

      return a.name.localeCompare(b.name);
    });

    sorted.forEach(voice => {
      const opt = document.createElement('option');
      opt.value = voice.voiceURI;
      opt.textContent = `${voice.name} (${voice.lang})`;
      if (voice.voiceURI === appSettings.voiceUri) {
        opt.selected = true;
      }
      elements.selectVoice.appendChild(opt);
    });

    if (!appSettings.voiceUri && sorted.length > 0) {
      // Elegir la voz más natural en español por defecto si existe
      const defaultEs = sorted.find(v => v.lang && v.lang.startsWith('es')) || sorted[0];
      elements.selectVoice.value = defaultEs.voiceURI;
      appSettings.voiceUri = defaultEs.voiceURI;
      saveSettings();
      tts.updateSettings({ voiceUri: defaultEs.voiceURI });
    }
  };

  // Forzar carga inmediata de voces si ya estaban disponibles en el navegador
  if (tts.availableVoices && tts.availableVoices.length > 0) {
    tts.onVoicesLoaded(tts.availableVoices);
  } else {
    tts.initVoices();
  }


  // 6. Actualización de Cola en la UI
  tts.onQueueChanged = (queue, isPlaying) => {
    elements.queueCounterBadge.textContent = `${queue.length} en cola`;

    if (queue.length > 0 && isPlaying) {
      const current = queue[0];
      elements.playerEmpty.style.display = 'none';
      elements.nowPlayingContent.style.display = 'flex';
      elements.playerBox.classList.add('playing');
      elements.playingUsername.textContent = current.displayName;
      elements.playingUsername.style.color = current.color || 'var(--accent)';
      elements.playingUserRole.textContent = current.role;
      elements.playingMessage.textContent = `"${current.cleanMessage}"`;
    } else {
      elements.playerEmpty.style.display = 'block';
      elements.nowPlayingContent.style.display = 'none';
      elements.playerBox.classList.remove('playing');
    }

    // Renderizar lista de espera (elementos 1 en adelante)
    elements.queueList.innerHTML = '';
    const pending = queue.slice(1);

    if (pending.length === 0) {
      elements.queueList.innerHTML = '<div class="player-empty" style="padding: 10px 0;">No hay más mensajes en espera</div>';
    } else {
      pending.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'queue-item';
        div.innerHTML = `
          <div class="queue-item-text">
            <strong style="color: ${item.color || 'var(--accent)'}">${item.displayName}:</strong> ${item.cleanMessage}
          </div>
          <span style="font-size: 9px; color: var(--text-muted);">${item.timestamp}</span>
        `;
        elements.queueList.appendChild(div);
      });
    }
  };

  // 7. Estado de Conexión de Twitch
  twitch.onStatusChange = (status, message) => {
    elements.twitchStatusBadge.className = `status-badge ${status}`;
    elements.twitchStatusText.textContent = status === 'connected' ? 'En Línea' : (status === 'connecting' ? 'Conectando...' : 'Desconectado');
    elements.btnConnectTwitch.textContent = status === 'connected' ? 'Desconectar' : 'Conectar';
    elements.btnConnectTwitch.className = status === 'connected' ? 'btn btn-danger' : 'btn btn-primary';
  };

  // 8. Event Listeners
  function switchTab(targetId) {
    elements.tabs.forEach(t => {
      if (t.getAttribute('data-target') === targetId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });
    elements.tabContents.forEach(c => {
      if (c.id === targetId) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  }

  // Tabs Navigation
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');
      switchTab(targetId);
    });
  });

  // Al hacer clic en el badge de estado, llevar al usuario a la pestaña de configuración de Twitch
  if (elements.twitchStatusBadge) {
    elements.twitchStatusBadge.style.cursor = 'pointer';
    elements.twitchStatusBadge.title = 'Configurar conexión de Twitch';
    elements.twitchStatusBadge.addEventListener('click', () => {
      switchTab('tab-twitch');
      if (elements.inputTwitchChannel) elements.inputTwitchChannel.focus();
    });
  }

  // Desbloqueo pasivo de audio en el primer clic (sin interrumpir reproducción)
  const unlockAudio = () => {
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
  };
  document.addEventListener('click', unlockAudio);
  document.addEventListener('keydown', unlockAudio);

  // Mute Toggle
  elements.btnToggleMute.addEventListener('click', () => {
    tts.setMute(!tts.isMuted);
    if (tts.isMuted) {
      elements.btnToggleMute.textContent = '🔇';
      elements.btnToggleMute.classList.add('active-mute');
    } else {
      elements.btnToggleMute.textContent = '🔊';
      elements.btnToggleMute.classList.remove('active-mute');
    }
  });

  // Skip & Clear
  elements.btnSkip.addEventListener('click', () => tts.skipCurrent());
  elements.btnClearQueue.addEventListener('click', () => tts.clearQueue());

  // Quick Test TTS
  elements.btnTestSpeak.addEventListener('click', () => {
    const text = elements.inputTestText.value.trim() || 'Hola este es un mensaje de prueba';
    tts.addToQueue({
      username: 'Streamer',
      displayName: 'Streamer',
      color: '#00f59b',
      role: 'broadcaster',
      message: text
    });
    elements.inputTestText.value = '';
  });
  elements.inputTestText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') elements.btnTestSpeak.click();
  });

  // Sliders
  elements.rangeVolume.addEventListener('input', (e) => {
    appSettings.volume = parseFloat(e.target.value);
    elements.valVolume.textContent = `${Math.round(appSettings.volume * 100)}%`;
    saveSettings();
    updateModules();
  });

  elements.rangeRate.addEventListener('input', (e) => {
    appSettings.rate = parseFloat(e.target.value);
    elements.valRate.textContent = `${appSettings.rate}x`;
    saveSettings();
    updateModules();
  });

  elements.rangePitch.addEventListener('input', (e) => {
    appSettings.pitch = parseFloat(e.target.value);
    elements.valPitch.textContent = appSettings.pitch;
    saveSettings();
    updateModules();
  });

  // Engine Select
  elements.selectTtsEngine.addEventListener('change', (e) => {
    appSettings.ttsEngine = e.target.value;
    toggleEngineUI(appSettings.ttsEngine);
    saveSettings();
    updateModules();
  });

  // Voice Select
  elements.selectVoice.addEventListener('change', (e) => {
    appSettings.voiceUri = e.target.value;
    saveSettings();
    updateModules();
  });

  elements.selectGoogleLang.addEventListener('change', (e) => {
    appSettings.googleLang = e.target.value;
    saveSettings();
    updateModules();
  });

  // Read Username Checkbox
  elements.chkReadUsername.addEventListener('change', (e) => {
    appSettings.readUsername = e.target.checked;
    elements.usernameTemplateGroup.style.display = appSettings.readUsername ? 'flex' : 'none';
    saveSettings();
    updateModules();
  });

  elements.inputUsernameTemplate.addEventListener('input', (e) => {
    appSettings.usernameTemplate = e.target.value;
    saveSettings();
    updateModules();
  });

  // Twitch Connect
  elements.btnConnectTwitch.addEventListener('click', () => {
    if (twitch.isConnected) {
      twitch.disconnect();
      elements.twitchStatusBadge.className = 'status-badge disconnected';
      elements.twitchStatusText.textContent = 'Desconectado';
      elements.btnConnectTwitch.textContent = 'Conectar';
      elements.btnConnectTwitch.className = 'btn btn-primary';
    } else {
      const channel = elements.inputTwitchChannel.value.trim();
      if (!channel) {
        alert('Por favor escribe el nombre de tu canal de Twitch');
        return;
      }
      appSettings.channel = channel;
      saveSettings();
      twitch.connect(channel);
    }
  });

  // Twitch Commands & Roles
  elements.chkRequireCommand.addEventListener('change', (e) => {
    appSettings.requireCommand = e.target.checked;
    elements.commandInputGroup.style.display = appSettings.requireCommand ? 'flex' : 'none';
    saveSettings();
    updateModules();
  });

  elements.inputTtsCommand.addEventListener('input', (e) => {
    appSettings.command = e.target.value.trim() || '!tts';
    saveSettings();
    updateModules();
  });

  const roleCheckboxes = [
    { el: elements.roleAll, key: 'all' },
    { el: elements.roleSubs, key: 'subs' },
    { el: elements.roleVips, key: 'vips' },
    { el: elements.roleMods, key: 'mods' }
  ];

  roleCheckboxes.forEach(({ el, key }) => {
    el.addEventListener('change', () => {
      appSettings.allowedRoles[key] = el.checked;
      saveSettings();
      updateModules();
    });
  });

  // Filters
  elements.inputCooldown.addEventListener('input', (e) => {
    appSettings.cooldown = parseInt(e.target.value, 10) || 0;
    saveSettings();
    updateModules();
  });

  elements.inputMaxChars.addEventListener('input', (e) => {
    appSettings.maxChars = parseInt(e.target.value, 10) || 200;
    saveSettings();
    updateModules();
  });

  elements.chkFilterUrls.addEventListener('change', (e) => {
    appSettings.filterUrls = e.target.checked;
    saveSettings();
    updateModules();
  });

  elements.chkIgnoreBots.addEventListener('change', (e) => {
    appSettings.ignoreKnownBots = e.target.checked;
    saveSettings();
    updateModules();
  });

  elements.inputIgnoredUsers.addEventListener('input', (e) => {
    appSettings.ignoredUsers = e.target.value;
    saveSettings();
    updateModules();
  });

  elements.inputBlacklist.addEventListener('input', (e) => {
    appSettings.blacklist = e.target.value;
    saveSettings();
    updateModules();
  });

  // Copy Overlay URL
  elements.btnCopyOverlayUrl.addEventListener('click', () => {
    let overlayUrl = '';
    if (window.location.protocol === 'file:') {
      overlayUrl = window.location.href.replace(/index\.html$/, 'overlay.html');
      if (!overlayUrl.includes('overlay.html')) {
        overlayUrl += '/overlay.html';
      }
    } else {
      overlayUrl = `${window.location.origin}/overlay.html`;
    }

    navigator.clipboard.writeText(overlayUrl).then(() => {
      const originalText = elements.btnCopyOverlayUrl.textContent;
      elements.btnCopyOverlayUrl.textContent = '¡URL Copiada! ✅';
      setTimeout(() => {
        elements.btnCopyOverlayUrl.textContent = originalText;
      }, 2000);
    }).catch(() => {
      prompt('Copia este enlace para el Browser Source de OBS:', overlayUrl);
    });
  });

  // Inicializar UI
  applySettingsToUI();

  // Si ya había un canal guardado, conectar automáticamente
  if (appSettings.channel) {
    twitch.connect(appSettings.channel);
  }
});
