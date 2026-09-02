/**
 * Twitch Chat Manager - Conexión directa y nativa por WebSocket (Sin librerías externas)
 * Compatible al 100% con OBS Studio CEF y protocolos file:/// o http://
 */
class TwitchChatManager {
  constructor(ttsEngine) {
    this.tts = ttsEngine;
    this.ws = null;
    this.isConnected = false;
    this.userCooldowns = new Map();
    this.reconnectTimer = null;

    this.KNOWN_BOTS = new Set([
      'streamelements',
      'nightbot',
      'moobot',
      'fossabot',
      'wizebot',
      'streamlabs',
      'botisimo',
      'soundalerts',
      'kofi_stream_bot',
      'pretzelrocks',
      'pokemoncommunitygame',
      'blerp',
      'sery_bot',
      'crexpender',
      'ankhbot',
      'deepbot'
    ]);

    this.settings = {
      channel: '',
      command: '!tts',
      requireCommand: true,
      ignoreKnownBots: true,
      ignoredUsers: [],
      allowedRoles: {
        all: true,
        subs: true,
        vips: true,
        mods: true,
        broadcaster: true
      },
      userCooldownSeconds: 5,
      blacklist: []
    };
  }

  updateSettings(newSettings) {
    const oldChannel = this.settings.channel;
    this.settings = { ...this.settings, ...newSettings };

    if (this.isConnected && oldChannel !== this.settings.channel && this.settings.channel) {
      this.reconnect();
    }
  }

  setIgnoredUsers(usersArray) {
    this.settings.ignoredUsers = usersArray.map(u => u.trim().toLowerCase()).filter(Boolean);
  }

  setBlacklist(wordsArray) {
    this.settings.blacklist = wordsArray.map(w => w.trim().toLowerCase()).filter(Boolean);
  }

  connect(channelName) {
    if (channelName) {
      this.settings.channel = channelName.trim().toLowerCase().replace(/^#/, '');
    }

    if (!this.settings.channel) {
      if (this.onStatusChange) this.onStatusChange('error', 'Introduce un canal');
      return;
    }

    this.disconnect();

    if (this.onStatusChange) this.onStatusChange('connecting', `Conectando a #${this.settings.channel}...`);

    try {
      this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

      this.ws.onopen = () => {
        const anonNick = `justinfan${Math.floor(10000 + Math.random() * 89999)}`;
        this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
        this.ws.send('PASS SCHMOOPIIE');
        this.ws.send(`NICK ${anonNick}`);
        this.ws.send(`JOIN #${this.settings.channel}`);

        this.isConnected = true;
        if (this.onStatusChange) this.onStatusChange('connected', `Conectado a #${this.settings.channel}`);
      };

      this.ws.onmessage = (event) => {
        const lines = event.data.split('\r\n');
        for (const line of lines) {
          if (!line) continue;
          this.parseIrcLine(line);
        }
      };

      this.ws.onerror = (err) => {
        console.error('Error WebSocket Twitch:', err);
        this.isConnected = false;
        if (this.onStatusChange) this.onStatusChange('error', 'Error en conexión');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (this.onStatusChange) this.onStatusChange('disconnected', 'Desconectado');
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };

    } catch (e) {
      console.error('Fallo iniciando WebSocket:', e);
      if (this.onStatusChange) this.onStatusChange('error', 'Error al iniciar');
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.isConnected = false;
  }

  reconnect() {
    this.disconnect();
    this.connect();
  }

  parseIrcLine(rawLine) {
    // Responder PING de Twitch para mantener conexión viva
    if (rawLine.startsWith('PING')) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('PONG :tmi.twitch.tv');
      }
      return;
    }

    // Procesar mensajes del chat PRIVMSG
    if (!rawLine.includes('PRIVMSG')) return;

    try {
      let tags = {};
      let line = rawLine;

      if (line.startsWith('@')) {
        const spaceIdx = line.indexOf(' ');
        const rawTags = line.substring(1, spaceIdx).split(';');
        for (const tag of rawTags) {
          const eqIdx = tag.indexOf('=');
          if (eqIdx !== -1) {
            tags[tag.substring(0, eqIdx)] = tag.substring(eqIdx + 1);
          }
        }
        line = line.substring(spaceIdx + 1);
      }

      // Extraer usuario
      let username = tags['display-name'];
      if (!username) {
        const match = line.match(/^:([a-zA-Z0-9_]+)!/);
        if (match) username = match[1];
      }
      username = username || 'anon';

      const privMsgIdx = line.indexOf('PRIVMSG');
      if (privMsgIdx === -1) return;

      const colonIdx = line.indexOf(':', privMsgIdx);
      if (colonIdx === -1) return;

      const message = line.substring(colonIdx + 1);
      const color = tags['color'] || '#00f0ff';
      const badges = tags['badges'] || '';

      // Determinar Rol
      let role = 'all';
      if (badges.includes('broadcaster')) role = 'broadcaster';
      else if (tags['mod'] === '1' || badges.includes('moderator')) role = 'mod';
      else if (badges.includes('vip')) role = 'vip';
      else if (tags['subscriber'] === '1' || badges.includes('subscriber')) role = 'sub';

      this.handleChatMessage({
        username: username,
        displayName: username,
        color: color,
        role: role,
        rawMessage: message
      });

    } catch (err) {
      console.error('Error parseando IRC Twitch:', err);
    }
  }

  checkRolePermission(role) {
    if (role === 'broadcaster' && this.settings.allowedRoles.broadcaster) return true;
    if (role === 'mod' && (this.settings.allowedRoles.mods || this.settings.allowedRoles.all)) return true;
    if (role === 'vip' && (this.settings.allowedRoles.vips || this.settings.allowedRoles.all)) return true;
    if (role === 'sub' && (this.settings.allowedRoles.subs || this.settings.allowedRoles.all)) return true;
    if (role === 'all' && this.settings.allowedRoles.all) return true;
    return false;
  }

  checkBlacklist(text) {
    if (!this.settings.blacklist || this.settings.blacklist.length === 0) return false;
    const lower = text.toLowerCase();
    return this.settings.blacklist.some(badWord => lower.includes(badWord));
  }

  checkCooldown(username) {
    if (this.settings.userCooldownSeconds <= 0) return true;
    const now = Date.now();
    const lastTime = this.userCooldowns.get(username) || 0;
    const cooldownMs = this.settings.userCooldownSeconds * 1000;

    if (now - lastTime < cooldownMs) {
      return false;
    }

    this.userCooldowns.set(username, now);
    return true;
  }

  isIgnoredUser(username) {
    const userLower = (username || '').toLowerCase();

    // Comprobar si es un bot conocido
    if (this.settings.ignoreKnownBots && this.KNOWN_BOTS.has(userLower)) {
      return true;
    }

    // Comprobar lista de usuarios ignorados personalizados
    if (this.settings.ignoredUsers && this.settings.ignoredUsers.includes(userLower)) {
      return true;
    }

    return false;
  }

  handleChatMessage(data) {
    const { username, displayName, color, role, rawMessage } = data;

    // 0. Validar si es un Bot o Usuario Ignorado
    if (this.isIgnoredUser(username)) {
      return;
    }

    // 0.1. Filtrar cualquier mensaje que sea un comando de chat (!, /, ., $, ?)
    const trimmedRaw = (rawMessage || '').trim();
    const ttsPrefix = this.settings.command.trim().toLowerCase(); // ej: !tts

    // Si empieza por un prefijo de comando y no es !tts, ignorarlo de inmediato
    if (trimmedRaw.startsWith('!') || trimmedRaw.startsWith('/') || trimmedRaw.startsWith('.') || trimmedRaw.startsWith('$') || trimmedRaw.startsWith('?')) {
      if (!trimmedRaw.toLowerCase().startsWith(ttsPrefix)) {
        return; // Es un comando general de bot (!top, !nivel, !xp, !lurk, etc.), NO leer por voz
      }
    }

    // 1. Validar Permisos de Rol
    if (!this.checkRolePermission(role)) return;

    let speechText = trimmedRaw;

    // 2. Validar y extraer Comando TTS
    if (this.settings.requireCommand) {
      if (!speechText.toLowerCase().startsWith(ttsPrefix)) return;
      speechText = speechText.substring(ttsPrefix.length).trim();
    }

    // 2.1. Si el texto resultante empieza por otro comando (ej: "!tts !top"), ignorarlo
    if (speechText.startsWith('!') || speechText.startsWith('/') || speechText.startsWith('.') || speechText.startsWith('$') || speechText.startsWith('?')) {
      return;
    }

    if (!speechText) return;

    // 3. Validar Palabras Prohibidas
    if (this.checkBlacklist(speechText)) return;

    // 4. Validar Cooldown
    if (role !== 'broadcaster' && role !== 'mod') {
      if (!this.checkCooldown(username)) return;
    }

    // 5. Enviar a Cola de TTS
    this.tts.addToQueue({
      username: username,
      displayName: displayName,
      color: color,
      role: role,
      message: speechText
    });
  }
}
