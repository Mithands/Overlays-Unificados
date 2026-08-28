const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3030;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Endpoint Proxy para Google Translate TTS (evita problemas de CORS en navegadores/OBS)
app.get('/api/tts/google', (req, res) => {
  const text = req.query.text;
  const lang = req.query.lang || 'es';

  if (!text) {
    return res.status(400).json({ error: 'Texto requerido' });
  }

  const encodedText = encodeURIComponent(text.substring(0, 200));
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${lang}&client=tw-ob`;

  https.get(url, (ttsRes) => {
    res.setHeader('Content-Type', 'audio/mpeg');
    ttsRes.pipe(res);
  }).on('error', (err) => {
    console.error('Error Google TTS:', err);
    res.status(500).json({ error: 'Error al generar TTS' });
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`🚀 Twitch TTS Bot para OBS Studio iniciado`);
  console.log(`📱 Micro Interfaz (Dock de OBS): http://localhost:${PORT}`);
  console.log(`🖥️ Overlay (Fuente de Navegador): http://localhost:${PORT}/overlay.html`);
  console.log(`==============================================\n`);
});
