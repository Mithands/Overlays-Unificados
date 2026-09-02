/**
 * Servidor Local Ultraligero para Overlays Mithands
 * 0 Dependencias externas (Usa módulos nativos de Node.js: http, fs, path)
 * Permite que OBS Studio y el navegador compartan el mismo origen http://localhost:3000 con 0 ms de latencia
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    // Configurar cabeceras CORS para permitir comunicación total
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') {
        reqPath = '/Overlay-principal/index.html';
    }

    let filePath = path.join(ROOT_DIR, reqPath);

    // Si es un directorio, buscar index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`404: Archivo no encontrado (${reqPath})`);
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`500: Error interno del servidor (${err.code})`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  🚀 SERVIDOR LOCAL DE OVERLAYS MITHANDS ACTIVO`);
    console.log(`======================================================`);
    console.log(`  📺 Overlay Unificado (OBS): http://localhost:${PORT}/Overlay-principal/index.html`);
    console.log(`  🎛️ Master Control Dock (OBS): http://localhost:${PORT}/Overlay-principal/master-dock.html`);
    console.log(`  🗺️ Roadmap de Tareas:       http://localhost:${PORT}/ROADMAP.html`);
    console.log(`======================================================\n`);
});
