/**
 * Overlay Inicio - Lógica de Streams Recientes y Cuenta Atrás
 * Overlays Mithands
 */

const gistService = new GistService(typeof CONFIG !== 'undefined' ? CONFIG : {});
const historyService = new HistoryService(typeof CONFIG !== 'undefined' ? CONFIG : {}, gistService);

const UPDATE_INTERVAL = 300000; // 5 minutos en ms
let timeLeft = 300; // 5 minutos en segundos

async function loadRecentStreams() {
    try {
        const data = await gistService.loadFile(CONFIG.FILENAME);
        if (!data) return;
        
        // Convertir objeto a array, filtrar entradas inválidas y ordenar por fecha (más reciente primero)
        const streams = Object.values(data)
            .filter(s => s && s.title && !s.title.toLowerCase().includes('error') && !s.title.toLowerCase().includes('occurred'))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const container = document.getElementById('streams-list');
        if (!container) return;
        container.innerHTML = ''; 

        // Tomar los 3 más recientes y mostrarlos por orden (el más reciente arriba)
        const topThree = streams.slice(0, 3);
        
        topThree.forEach((stream, index) => {
            const card = document.createElement('div');
            card.className = 'stream-card';
            card.style.animationDelay = `${(index + 1) * 0.2}s`;
            
            const dateFormatted = new Date(stream.date).toLocaleDateString('es-ES');

            card.innerHTML = `
                <div class="stream-info">
                    <span class="stream-title">${stream.title}</span>
                    <span class="stream-meta">${stream.category} • ${dateFormatted}</span>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error cargando directos:', error);
    }
}

function updateTimer() {
    if (timeLeft <= 0) {
        const countdownEl = document.getElementById('countdown-text');
        const progressEl = document.getElementById('progress-bar-fill');
        if (countdownEl) countdownEl.innerText = "00:00";
        if (progressEl) progressEl.style.width = "100%";
        return;
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    const countdownEl = document.getElementById('countdown-text');
    const progressEl = document.getElementById('progress-bar-fill');

    if (countdownEl) {
        countdownEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (progressEl) {
        const percentage = ((300 - timeLeft) / 300) * 100;
        progressEl.style.width = `${percentage}%`;
    }

    timeLeft--;

    if (timeLeft === 0) {
        loadRecentStreams();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadRecentStreams();
    historyService.start();
    setInterval(updateTimer, 1000);
});