/**
 * Cyberpunk Stream Stats Widget - StreamElements Realtime Socket.io & REST
 * (Seguidores y Suscriptores con datos por defecto y actualización en tiempo real)
 */

const CONFIG = {
    TWITCH_CHANNEL: 'mithands',
    SE_JWT_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjaXRhZGVsIiwiZXhwIjoxNzg4NjYwMjU3LCJqdGkiOiJhNWQ3MWViNy0yODMxLTRjYTgtOGI1Mi0xNzBjNDcyZWE4ZTIiLCJjaGFubmVsIjoiNjAzNTU0MWIwZjc3ZWQ5YTgyODdhYjFkIiwicm9sZSI6Im93bmVyIiwiYXV0aFRva2VuIjoiQ1MzQlA3VXFCMVVwdlRvN2ZIbnlVOEhaYlJJSTVhQTZQRUV5eFB1UzVQSl9mYW52IiwidXNlciI6IjYwMzU1NDFiMGY3N2VkODYwMTg3YWIxYyIsInVzZXJfaWQiOiJjOWUyOThmMC1kMGU5LTRhOGEtYjI2NS1iYjYzNjkwYzRhOGYiLCJ1c2VyX3JvbGUiOiJjcmVhdG9yIiwicHJvdmlkZXIiOiJ0d2l0Y2giLCJwcm92aWRlcl9pZCI6Ijc1NDE3MTUxIiwiY2hhbm5lbF9pZCI6IjZkNjUyOTRlLWFkNjItNGJmZC1hNmIxLTM1MWM5MTA4NTFjYSIsImNyZWF0b3JfaWQiOiI0NmI1ZjY1Yy1iZjJlLTRkNjctYjcyYS1jNDBlNDMwNmI5NjMifQ.rqTdc3c5BwAGyRgAt_LgeqW79v1sCZBnRnHzIMM8AJQ'
};

// Datos por defecto guardados en el código
const DEFAULT_DATA = {
    follower: 'CitrusJupiter',
    subscriber: '01jenial',
    subTier: 'TIER 1'
};

function setStatus(msg) {
    console.log("[Widget Status]", msg);
    document.querySelectorAll('.timestamp').forEach(el => el.textContent = "Status: " + msg.toUpperCase());
}

function updateUI(type, name, extra = '') {
    try {
        const nameEl = document.getElementById(`${type}-name`);
        const cardEl = document.getElementById(`latest-${type}`);
        if (!nameEl || !name) return;

        const cleanName = String(name).trim();
        const badKeywords = ['410', 'error', 'cargando', 'gone', 'not supported', '<html', 'undefined', 'null'];
        if (badKeywords.some(bk => cleanName.toLowerCase().includes(bk))) return;
        if (cleanName === '---' || cleanName === '' || cleanName === 'Esperando...') return;

        nameEl.textContent = cleanName;

        if (type === 'subscriber') {
            const t = document.getElementById('subscriber-tier');
            if (t) {
                let tierDisplay = String(extra).toUpperCase();
                if (tierDisplay === 'PRIME' || tierDisplay === '0') tierDisplay = 'PRIME';
                else if (tierDisplay === '1000' || tierDisplay === '1') tierDisplay = 'TIER 1';
                else if (tierDisplay === '2000' || tierDisplay === '2') tierDisplay = 'TIER 2';
                else if (tierDisplay === '3000' || tierDisplay === '3') tierDisplay = 'TIER 3';
                else if (tierDisplay && !tierDisplay.includes('TIER') && tierDisplay !== 'UNDEFINED') tierDisplay = `TIER ${extra}`;
                else if (!tierDisplay || tierDisplay === 'UNDEFINED') tierDisplay = 'TIER 1';
                t.textContent = tierDisplay;
            }
        }

        if (cardEl && !cleanName.includes('Cargando')) {
            cardEl.classList.remove('updating');
            void cardEl.offsetWidth;
            cardEl.classList.add('updating');
            setTimeout(() => cardEl.classList.remove('updating'), 800);
        }
    } catch (e) {
        console.error("Error UI:", e);
    }
}

class StreamElementsService {
    constructor(config) {
        this.token = config.SE_JWT_TOKEN;
        this.channelId = null;
        this.socket = null;
    }

    start() {
        // 1. Mostrar inmediatamente los datos iniciales (Default o LocalStorage)
        this.initInitialData();

        if (!this.token) {
            console.warn('No StreamElements JWT Token provided.');
            return;
        }

        setStatus("SE: CONNECTING...");

        // 2. Obtener historial reciente vía REST API (Sessions & Activities)
        this.fetchHistory();

        // 3. Conectar WebSocket con Socket.io para tiempo real
        if (typeof io !== 'undefined') {
            try {
                this.socket = io('https://realtime.streamelements.com', {
                    transports: ['websocket']
                });

                this.socket.on('connect', () => {
                    setStatus("SE: REALTIME ON");
                    console.log('Connected to StreamElements WebSocket');
                    this.socket.emit('authenticate', { method: 'jwt', token: this.token });
                });

                this.socket.on('authenticated', () => {
                    setStatus("SE: AUTH OK");
                });

                this.socket.on('event', (eventData) => {
                    this.handleEvent(eventData);
                });

                this.socket.on('event:test', (eventData) => {
                    this.handleEvent(eventData);
                });

                this.socket.on('event:update', (eventData) => {
                    this.handleEvent(eventData);
                });
            } catch (err) {
                console.error("Socket.io error:", err);
            }
        } else {
            console.warn("Socket.io not loaded. Polling REST API as fallback.");
            setInterval(() => this.fetchHistory(), 30000);
        }
    }

    initInitialData() {
        try {
            const cached = JSON.parse(localStorage.getItem('se_stats_cache'));
            const initial = cached || DEFAULT_DATA;

            if (initial.follower) updateUI('follower', initial.follower);
            if (initial.subscriber) updateUI('subscriber', initial.subscriber, initial.subTier || 'TIER 1');
        } catch (e) {
            updateUI('follower', DEFAULT_DATA.follower);
            updateUI('subscriber', DEFAULT_DATA.subscriber, DEFAULT_DATA.subTier);
        }
    }

    saveCachedEvents() {
        try {
            const cache = {
                follower: document.getElementById('follower-name')?.textContent || DEFAULT_DATA.follower,
                subscriber: document.getElementById('subscriber-name')?.textContent || DEFAULT_DATA.subscriber,
                subTier: document.getElementById('subscriber-tier')?.textContent || DEFAULT_DATA.subTier
            };
            localStorage.setItem('se_stats_cache', JSON.stringify(cache));
        } catch (e) {}
    }

    async fetchHistory() {
        try {
            const base64Url = this.token.split('.')[1];
            if (!base64Url) throw new Error("Token no válido");
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            this.channelId = payload.channel;

            if (this.channelId) {
                let gotFollower = false;
                let gotSubscriber = false;

                // 1. Consultar endpoint sessions (contiene follower-latest, subscriber-latest, follower-recent, subscriber-recent)
                try {
                    const sessionRes = await fetch(`https://api.streamelements.com/kappa/v2/sessions/${this.channelId}`, {
                        headers: { 
                            'Authorization': 'jwt ' + this.token,
                            'Accept': 'application/json'
                        }
                    });

                    if (sessionRes.ok) {
                        const sessionJson = await sessionRes.json();
                        const data = sessionJson.data || {};

                        // Seguidor
                        const fLatest = data['follower-latest']?.name;
                        const fRecent = Array.isArray(data['follower-recent']) && data['follower-recent'][0]?.name;
                        const followerName = fLatest || fRecent;
                        if (followerName) {
                            updateUI('follower', followerName);
                            gotFollower = true;
                        }

                        // Suscriptor
                        const sLatest = data['subscriber-latest'];
                        const sRecent = Array.isArray(data['subscriber-recent']) && data['subscriber-recent'][0];
                        const subObj = sLatest?.name ? sLatest : (sRecent?.name ? sRecent : null);
                        if (subObj && subObj.name) {
                            updateUI('subscriber', subObj.name, subObj.tier || subObj.amount || '1');
                            gotSubscriber = true;
                        }
                    }
                } catch (sessErr) {
                    console.warn("Error fetching SE sessions:", sessErr);
                }

                // 2. Si falta alguno, consultar activities
                if (!gotFollower || !gotSubscriber) {
                    try {
                        const actsRes = await fetch(`https://api.streamelements.com/kappa/v2/activities/${this.channelId}?limit=50`, {
                            headers: { 
                                'Authorization': 'jwt ' + this.token,
                                'Accept': 'application/json'
                            }
                        });
                        
                        if (actsRes.ok) {
                            const actsData = await actsRes.json();
                            const eventsArray = Array.isArray(actsData) ? actsData : (actsData.docs || []);
                            
                            for (const doc of eventsArray) {
                                const type = doc.type;
                                const data = doc.data || {};
                                const name = data.displayName || data.username || doc.name;

                                if (!name) continue;

                                if (!gotFollower && (type === 'follow' || type === 'follower')) {
                                    updateUI('follower', name);
                                    gotFollower = true;
                                }
                                if (!gotSubscriber && (type === 'subscriber' || type === 'sub')) {
                                    updateUI('subscriber', name, data.tier || data.amount || '1');
                                    gotSubscriber = true;
                                }

                                if (gotFollower && gotSubscriber) break;
                            }
                        }
                    } catch (actErr) {
                        console.warn("Error fetching SE activities:", actErr);
                    }
                }

                this.saveCachedEvents();
                setStatus("SE: SYNC OK");
            }
        } catch (error) {
            console.error('Error fetching StreamElements history:', error);
            setStatus("SE: READY");
        }
    }

    handleEvent(eventData) {
        if (!eventData) return;
        const type = eventData.type || eventData.listener?.replace('-latest', '');
        const data = eventData.data || eventData;
        const name = data.displayName || data.username || data.name;

        if (!name) return;

        if (type === 'follow' || type === 'follower') {
            updateUI('follower', name);
            triggerLiveAlert('follower');
        } else if (type === 'subscriber' || type === 'sub') {
            updateUI('subscriber', name, data.tier || data.amount || '1');
            triggerLiveAlert('subscriber');
        }

        this.saveCachedEvents();
    }
}

// -------------------------------------------------------------
// GESTOR DE ROTACIÓN Y VISIBILIDAD (MISMO LUGAR)
// 1º Último Subcriptor (5 seg)
// 2º Último Seguidor (5 seg)
// 3º Oculto durante media hora (30 minutos)
// -------------------------------------------------------------

const ROTATION_CONFIG = {
    subDuration: 5000,         // 5 segundos
    followerDuration: 5000,    // 5 segundos
    hiddenDuration: 1800000    // 1.800.000 ms (30 minutos / media hora)
};

let rotationTimer = null;

function showCard(type) {
    const subCard = document.getElementById('latest-subscriber');
    const followerCard = document.getElementById('latest-follower');

    if (type === 'subscriber') {
        if (followerCard) followerCard.classList.remove('active');
        if (subCard) {
            subCard.classList.remove('active');
            void subCard.offsetWidth; // Reflow para reiniciar animación
            subCard.classList.add('active');
        }
    } else if (type === 'follower') {
        if (subCard) subCard.classList.remove('active');
        if (followerCard) {
            followerCard.classList.remove('active');
            void followerCard.offsetWidth;
            followerCard.classList.add('active');
        }
    } else {
        // Ocultar ambos
        if (subCard) subCard.classList.remove('active');
        if (followerCard) followerCard.classList.remove('active');
    }
}

function startRotationCycle() {
    if (rotationTimer) clearTimeout(rotationTimer);

    // Paso 1: Mostrar 1º Último Suscriptor
    showCard('subscriber');

    // A los 5 segundos -> Paso 2: Mostrar Último Seguidor
    rotationTimer = setTimeout(() => {
        showCard('follower');

        // A los 5 segundos -> Paso 3: Ocultar ambos
        rotationTimer = setTimeout(() => {
            showCard('none');

            // Tras 30 minutos oculto -> Paso 4: Reiniciar ciclo
            rotationTimer = setTimeout(() => {
                startRotationCycle();
            }, ROTATION_CONFIG.hiddenDuration);

        }, ROTATION_CONFIG.followerDuration);

    }, ROTATION_CONFIG.subDuration);
}

// Alerta instantánea si llega un nuevo seguidor/sub en directo
function triggerLiveAlert(type) {
    if (rotationTimer) clearTimeout(rotationTimer);
    showCard(type);
    rotationTimer = setTimeout(() => {
        showCard('none');
        rotationTimer = setTimeout(() => {
            startRotationCycle();
        }, ROTATION_CONFIG.hiddenDuration);
    }, 10000); // Se muestra 10 segundos el nuevo evento y luego vuelve al ciclo
}

document.addEventListener('DOMContentLoaded', () => {
    const seService = new StreamElementsService(CONFIG);
    seService.start();

    // Iniciar el ciclo de rotación y ocultación
    startRotationCycle();

    // Sincronización periódica de respaldo cada 45 segundos
    setInterval(() => seService.fetchHistory(), 45000);
});
