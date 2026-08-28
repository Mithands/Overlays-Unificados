/**
 * TTS Engine - Manejador de síntesis de voz y cola de reproducción
 */
class TTSEngine {
  constructor() {
    this.queue = [];
    this.isPlaying = false;
    this.isMuted = false;
    this.currentUtterance = null;
    this.currentAudioElement = null;
    this.availableVoices = [];
    this.settings = {
      engine: 'native', // 'native' | 'google'
      voiceUri: '',
      lang: 'es-ES',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      readUsername: true,
      usernameTemplate: '{user} dice: ',
      maxChars: 250,
      filterUrls: true,
      filterEmotes: true
    };

    // Canal de comunicación con el Overlay de OBS
    this.broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('twitch_tts_channel') : null;

    this.initVoices();
  }

  initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const load = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          this.availableVoices = voices;
          if (this.onVoicesLoaded) {
            this.onVoicesLoaded(this.availableVoices);
          }
        }
      };

      load();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = load;
      }

      // Reintento periódico para navegadores que cargan voces asíncronamente (Edge/Chrome/OBS CEF)
      let retries = 0;
      const retryInterval = setInterval(() => {
        retries++;
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          this.availableVoices = voices;
          if (this.onVoicesLoaded) {
            this.onVoicesLoaded(this.availableVoices);
          }
          clearInterval(retryInterval);
        } else if (retries > 20) {
          clearInterval(retryInterval);
        }
      }, 150);
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  sanitizeText(text) {
    if (!text) return '';
    let clean = text.trim();

    // 1. Filtrar URLs
    if (this.settings.filterUrls) {
      clean = clean.replace(/https?:\/\/\S+/gi, '');
    }

    // 2. Limpiar caracteres repetidos excesivos (ej: 'holaaaaaaa' -> 'holaa', '7777777' -> '77')
    clean = clean.replace(/(.)\1{2,}/gi, '$1$1');

    // 3. Normalizar puntuación repetida a un solo signo (ej: '????' -> '?', '.....' -> '.', '!!!!' -> '!')
    clean = clean.replace(/([.!?¿¡,;:])\1+/g, '$1');

    // 4. Limpiar símbolos especiales raros manteniendo letras, números y puntuación estándar
    clean = clean.replace(/[^\p{L}\p{N}\s,;.!?:¿¡'"]/gu, ' ');

    // 5. Normalizar espacios múltiples
    clean = clean.replace(/\s+/g, ' ').trim();

    // 6. Límite de longitud
    if (clean.length > this.settings.maxChars) {
      clean = clean.substring(0, this.settings.maxChars);
    }

    return clean;
  }

  addToQueue(item) {
    const cleanMessage = this.sanitizeText(item.message);
    if (!cleanMessage) return;

    const queueItem = {
      id: Date.now() + Math.random().toString(36).substr(2, 5),
      username: item.username || 'Anónimo',
      displayName: item.displayName || item.username || 'Anónimo',
      color: item.color || '#9146FF',
      role: item.role || 'viewer',
      rawMessage: item.message,
      cleanMessage: cleanMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.queue.push(queueItem);

    if (this.onQueueChanged) {
      this.onQueueChanged(this.queue, this.isPlaying);
    }

    if (!this.isPlaying) {
      this.playNext();
    }
  }

  playNext() {
    if (this.isMuted || this.queue.length === 0) {
      this.isPlaying = false;
      if (this.onQueueChanged) {
        this.onQueueChanged(this.queue, this.isPlaying);
      }
      this.notifyOverlayState(null);
      return;
    }

    this.isPlaying = true;
    const currentItem = this.queue[0];

    if (this.onQueueChanged) {
      this.onQueueChanged(this.queue, this.isPlaying);
    }

    // Texto completo a leer
    let speakText = currentItem.cleanMessage;
    if (this.settings.readUsername) {
      const template = (this.settings.usernameTemplate || '{user} dice: ').replace('{user}', currentItem.displayName);
      speakText = `${template} ${speakText}`.trim();
    }

    this.notifyOverlayState({
      user: currentItem.displayName,
      color: currentItem.color,
      message: currentItem.cleanMessage,
      role: currentItem.role
    });

    if (this.settings.engine === 'google') {
      this.playGoogleTTS(speakText);
    } else {
      this.playNativeTTS(speakText);
    }
  }

  playNativeTTS(text) {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis no soportado');
      this.onFinishedItem();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    // Retener en ventana global para evitar que el Garbage Collector corte la voz a mitad de frase
    if (!window._activeUtterances) window._activeUtterances = new Set();
    window._activeUtterances.add(utterance);

    // Buscar voz seleccionada
    if (this.settings.voiceUri) {
      const voice = this.availableVoices.find(v => v.voiceURI === this.settings.voiceUri);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
    } else if (this.settings.lang) {
      utterance.lang = this.settings.lang;
    }

    utterance.rate = Math.max(0.5, Math.min(2.5, parseFloat(this.settings.rate) || 1.0));
    utterance.pitch = Math.max(0.5, Math.min(2.0, parseFloat(this.settings.pitch) || 1.0));
    utterance.volume = Math.max(0, Math.min(1.0, parseFloat(this.settings.volume) || 1.0));

    let hasEnded = false;
    const cleanup = () => {
      if (hasEnded) return;
      hasEnded = true;
      if (window._activeUtterances) {
        window._activeUtterances.delete(utterance);
      }
      this.onFinishedItem();
    };

    utterance.onend = cleanup;
    utterance.onerror = (e) => {
      // Ignorar cancelaciones intencionadas (skip / clear) para no desfasar la cola
      if (e && (e.error === 'canceled' || e.error === 'interrupted')) {
        if (window._activeUtterances) {
          window._activeUtterances.delete(utterance);
        }
        return;
      }
      console.error('TTS Error:', e);
      cleanup();
    };

    // Si estaba pausado el motor, reanudar
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    window.speechSynthesis.speak(utterance);
  }

  playGoogleTTS(text) {
    const lang = this.settings.lang ? this.settings.lang.split('-')[0] : 'es';
    const cleanText = encodeURIComponent(text.substring(0, 200));
    
    // Si se ejecuta mediante http/https con servidor local usa proxy, si se ejecuta como file:/// usa URL directa de Google
    let audioUrl;
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      audioUrl = `/api/tts/google?text=${cleanText}&lang=${lang}`;
    } else {
      audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${cleanText}&tl=${lang}&client=tw-ob`;
    }

    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement = null;
    }

    const targetRate = Math.max(0.5, Math.min(2.0, parseFloat(this.settings.rate) || 1.0));
    const targetVolume = Math.max(0, Math.min(1.0, parseFloat(this.settings.volume) || 1.0));

    const audio = new Audio(audioUrl);
    this.currentAudioElement = audio;
    audio.defaultPlaybackRate = targetRate;
    audio.playbackRate = targetRate;
    audio.volume = targetVolume;

    // Asegurar que el navegador aplique la velocidad al cargar el stream de audio
    audio.addEventListener('loadedmetadata', () => {
      audio.playbackRate = targetRate;
    });
    audio.addEventListener('play', () => {
      audio.playbackRate = targetRate;
    });

    audio.onended = () => {
      this.currentAudioElement = null;
      this.onFinishedItem();
    };

    audio.onerror = (e) => {
      console.warn('Fallback a nativo tras fallo de Google TTS:', e);
      this.currentAudioElement = null;
      this.playNativeTTS(text);
    };

    audio.play().then(() => {
      audio.playbackRate = targetRate;
    }).catch(e => {
      console.warn('Audio play error, fallback a nativo:', e);
      this.currentAudioElement = null;
      this.playNativeTTS(text);
    });
  }

  onFinishedItem() {
    if (this.queue.length > 0) {
      this.queue.shift();
    }
    this.currentUtterance = null;
    this.currentAudioElement = null;
    this.playNext();
  }

  skipCurrent() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement = null;
    }
    this.onFinishedItem();
  }

  clearQueue() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement = null;
    }
    this.queue = [];
    this.isPlaying = false;
    if (this.onQueueChanged) {
      this.onQueueChanged(this.queue, this.isPlaying);
    }
    this.notifyOverlayState(null);
  }

  setMute(muteState) {
    this.isMuted = muteState;
    if (this.isMuted) {
      this.skipCurrent();
    }
  }

  notifyOverlayState(data) {
    const msg = {
      type: data ? 'TTS_START' : 'TTS_STOP',
      payload: data,
      timestamp: Date.now()
    };

    // 1. BroadcastChannel (para ventanas y docks estándar)
    if (this.broadcast) {
      try {
        this.broadcast.postMessage(msg);
      } catch (e) {
        console.warn('Broadcast error:', e);
      }
    }

    // 2. LocalStorage sync (respaldo infalible para Browser Source en OBS bajo file://)
    try {
      localStorage.setItem('twitch_tts_overlay_sync', JSON.stringify(msg));
    } catch (e) {}
  }
}

