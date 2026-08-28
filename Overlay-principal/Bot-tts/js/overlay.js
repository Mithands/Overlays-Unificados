/**
 * Overlay Script - Recibe mensajes del Dock vía BroadcastChannel y Storage Event para OBS
 */
document.addEventListener('DOMContentLoaded', () => {
  const bubble = document.getElementById('ttsBubble');
  const usernameEl = document.getElementById('ttsUsername');
  const roleBadgeEl = document.getElementById('ttsRoleBadge');
  const messageEl = document.getElementById('ttsMessage');

  let hideTimeout = null;

  function handleSyncMessage(data) {
    const { type, payload } = data || {};
    if (type === 'TTS_START' && payload) {
      showTTSMessage(payload);
    } else if (type === 'TTS_STOP') {
      hideTTSMessage();
    }
  }

  // 1. Comunicación principal: BroadcastChannel
  const broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('twitch_tts_channel') : null;
  if (broadcast) {
    broadcast.onmessage = (event) => {
      handleSyncMessage(event.data);
    };
  }

  // 2. Comunicación de respaldo: Storage Event (Crucial para OBS Browser Source en file://)
  window.addEventListener('storage', (event) => {
    if (event.key === 'twitch_tts_overlay_sync' && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        handleSyncMessage(data);
      } catch (e) {}
    }
  });

  function showTTSMessage(data) {
    if (hideTimeout) clearTimeout(hideTimeout);

    usernameEl.textContent = data.user || 'Anónimo';
    usernameEl.style.color = data.color || '#9146ff';
    roleBadgeEl.textContent = (data.role || 'viewer').toUpperCase();
    messageEl.textContent = data.message || '';

    bubble.classList.add('visible');
  }

  function hideTTSMessage() {
    bubble.classList.remove('visible');
  }
});

