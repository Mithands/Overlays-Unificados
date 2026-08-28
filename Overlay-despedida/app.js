/**
 * Overlay Despedida - Lógica de Directos, TOP y Follows/Subs
 * Overlays Mithands
 */

const gistService = new GistService(typeof CONFIG !== 'undefined' ? CONFIG : {});
const historyService = new HistoryService(typeof CONFIG !== 'undefined' ? CONFIG : {}, gistService);
const seService = new StreamElementsService(typeof CONFIG !== 'undefined' ? CONFIG : {});

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

        // Tomar los 5 más recientes y mostrarlos por orden (el más reciente arriba)
        const recentStreams = streams.slice(0, 5);
        
        recentStreams.forEach((stream, index) => {
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

async function loadTopUsers() {
    try {
        // Obtenemos los datos del TSV (del otro proyecto)
        const url = 'https://gist.githubusercontent.com/Mithands/35606f8217454675da3829de792b7b3a/raw/';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener el top');
        
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim() !== '' && !line.startsWith('RANK'));
        
        const container = document.getElementById('top-list');
        if (!container) return;
        container.innerHTML = '';
        
        const topUsers = lines.slice(0, 10);
        topUsers.forEach((line, index) => {
            const [rank, username, timeFormat] = line.split('\t');
            
            const card = document.createElement('div');
            card.className = 'stream-card';
            card.style.animationDelay = `${(index + 1) * 0.2}s`;
            
            card.innerHTML = `
                <div class="stream-info">
                    <span class="stream-title">#${rank} ${username}</span>
                    <span class="stream-meta">${timeFormat || ''}</span>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error cargando top:', error);
    }
}

function renderFollowsSubs(events) {
    const container = document.getElementById('follows-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (!events || events.length === 0) {
        container.innerHTML = '<div class="stream-card"><div class="stream-info"><span class="stream-title">Esperando eventos...</span></div></div>';
        return;
    }

    events.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'stream-card';
        card.style.animationDelay = `${(index + 1) * 0.2}s`;
        
        card.innerHTML = `
            <div class="stream-info">
                <span class="stream-title">${item.type}: ${item.name}</span>
                <span class="stream-meta">${item.extra}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Suscribirse a los cambios de StreamElements
seService.onUpdate = renderFollowsSubs;

// --- Alternancia automática de secciones ---
const SECTIONS = ['directos', 'top', 'follows'];
let currentSection = 0;
let sectionTimeout = null;
let topScrollReq = null;
let totalScrolled = 0;
let maxScroll = null;
let scrollSpeed = 0.7; // Píxeles por frame

function animateTopScroll() {
    const list = document.getElementById('top-list');
    if (!list) return;

    // Calculamos el maxScroll una sola vez: 
    // parar cuando el usuario #6 esté arriba del todo del contenedor + un poco más
    if (maxScroll === null) {
        const targetCard = list.children[5]; // índice 5 = usuario nº 6
        if (!targetCard) return;
        maxScroll = targetCard.offsetTop + 30; // + 30px extra para ver un pelin más
    }

    totalScrolled += scrollSpeed;

    if (totalScrolled >= maxScroll) {
        // Snap exacto y paramos
        list.style.transform = `translateY(-${maxScroll}px)`;
        stopTopScroll();
        // 3 segundos de pausa y cambiamos a la siguiente sección
        if (sectionTimeout) clearTimeout(sectionTimeout);
        sectionTimeout = setTimeout(switchSection, 3000);
        return;
    }

    list.style.transform = `translateY(-${totalScrolled}px)`;
    topScrollReq = requestAnimationFrame(animateTopScroll);
}

function startTopScroll() {
    const list = document.getElementById('top-list');
    if (list) {
        list.style.transition = 'none';
        list.style.transform = 'translateY(0)';
    }
    totalScrolled = 0;
    maxScroll = null;
    if (topScrollReq) cancelAnimationFrame(topScrollReq);
    topScrollReq = requestAnimationFrame(animateTopScroll);
}

function stopTopScroll() {
    if (topScrollReq) {
        cancelAnimationFrame(topScrollReq);
        topScrollReq = null;
    }
}

function showSection(name) {
    // Quitar active de todos los nav
    document.querySelectorAll('.section-nav-item').forEach(el => el.classList.remove('section-active'));
    // Ocultar solo el panel que está visible
    document.querySelectorAll('.section-panel').forEach(el => {
        if (el.id === 'panel-' + name) return; // No tocar el que vamos a mostrar
        if (el.style.display !== 'none') {
            el.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            el.style.opacity = '0';
            el.style.transform = 'translateY(-8px)'; // sube ligeramente al salir
            setTimeout(() => {
                el.style.display = 'none';
                el.style.transform = 'translateY(8px)'; // preparar para entrar desde abajo
            }, 800);
        }
    });

    // Activar el nav seleccionado
    const navEl = document.getElementById('nav-' + name);
    if (navEl) navEl.classList.add('section-active');

    // Mostrar el panel con fade in suave desde abajo
    setTimeout(() => {
        const panelEl = document.getElementById('panel-' + name);
        if (panelEl) {
            panelEl.style.display = 'block';
            panelEl.style.opacity = '0';
            panelEl.style.transform = 'translateY(8px)';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => { // doble rAF para asegurar que el display:block ya ha rendereado
                    panelEl.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                    panelEl.style.opacity = '1';
                    panelEl.style.transform = 'translateY(0)';
                });
            });
        }
        
        if (name === 'top') {
            // Resetear inmediatamente al usuario 1 sin animación
            const topList = document.getElementById('top-list');
            if (topList) {
                topList.style.transition = 'none';
                topList.style.transform = 'translateY(0)';
            }
            totalScrolled = 0;
            maxScroll = null;
            setTimeout(startTopScroll, 2000); // Espera 2s antes de empezar el scroll
        } else {
            stopTopScroll();
        }
    }, 800);
}

function switchSection() {
    currentSection = (currentSection + 1) % SECTIONS.length;
    const nextSection = SECTIONS[currentSection];
    showSection(nextSection);
    
    // Tiempos dinámicos: 10s para directos/follows. Para el top ponemos 60s max (el scroll decide cuándo termina)
    const duration = nextSection === 'top' ? 60000 : 10000;
    if (sectionTimeout) clearTimeout(sectionTimeout);
    sectionTimeout = setTimeout(switchSection, duration);
}

document.addEventListener('DOMContentLoaded', () => {
    renderFollowsSubs([]); // Mostrar estado inicial
    loadRecentStreams();
    loadTopUsers();
    historyService.start();
    seService.start();

    // Mostrar la sección inicial
    showSection('directos');
    sectionTimeout = setTimeout(switchSection, 10000);

    // Recargar datos cada minuto si la sección no está activa
    setInterval(() => {
        const activeSection = SECTIONS[currentSection];
        if (activeSection !== 'directos') loadRecentStreams();
        if (activeSection !== 'top') loadTopUsers();
    }, 60000);
});