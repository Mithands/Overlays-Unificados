class StreamElementsService {
    constructor(config) {
        this.token = config.SE_JWT_TOKEN;
        
        const DEFAULT_EVENTS = [
            { type: 'Follow', name: 'citrusjupiter', extra: 'Nuevo seguidor' },
            { type: 'Follow', name: 'macusam', extra: 'Nuevo seguidor' },
            { type: 'Sub', name: '01jenial', extra: 'Suscripción Tier 1' },
            { type: 'Follow', name: 'inmaculadaconce', extra: 'Nuevo seguidor' },
            { type: 'Follow', name: 'tiokasualidades', extra: 'Nuevo seguidor' }
        ];
        
        const localEvents = JSON.parse(localStorage.getItem('se_events'));
        if (localEvents && localEvents.length > 0) {
            this.events = localEvents;
        } else {
            this.events = DEFAULT_EVENTS;
        }
        
        this.onUpdate = null;
        this.channelId = null;
        this.socket = null;
    }

    async start() {
        if (!this.token) {
            console.warn('No StreamElements JWT Token provided.');
            return;
        }

        // 1. Mostrar estado inicial de inmediato
        this.notifyUpdate();

        // 2. Fetch initial history (Sessions & Activities)
        await this.fetchHistory();

        // 3. Connect WebSocket for real-time updates
        if (typeof io !== 'undefined') {
            try {
                this.socket = io('https://realtime.streamelements.com', {
                    transports: ['websocket']
                });

                this.socket.on('connect', () => {
                    console.log('Connected to StreamElements WebSocket');
                    this.socket.emit('authenticate', { method: 'jwt', token: this.token });
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
                console.error("Socket.io connection error:", err);
            }
        }
    }

    async fetchHistory() {
        try {
            const base64Url = this.token.split('.')[1];
            if (!base64Url) throw new Error("Token no válido");
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            this.channelId = payload.channel;

            if (this.channelId) {
                const combinedEvents = [];

                // 1. Obtener datos de la sesión actual e históricos recientes de StreamElements
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

                        // Suscriptores recientes
                        if (Array.isArray(data['subscriber-recent'])) {
                            data['subscriber-recent'].forEach(s => {
                                if (s && s.name) {
                                    let extra = 'Suscripción Tier 1';
                                    if (s.tier === 'prime' || s.tier === '0') extra = 'Suscripción Prime';
                                    else if (s.tier === '2000' || s.tier == 2) extra = 'Suscripción Tier 2';
                                    else if (s.tier === '3000' || s.tier == 3) extra = 'Suscripción Tier 3';
                                    combinedEvents.push({
                                        type: 'Sub',
                                        name: s.name,
                                        extra: extra,
                                        date: s.createdAt ? new Date(s.createdAt).getTime() : 0
                                    });
                                }
                            });
                        }

                        // Seguidores recientes
                        if (Array.isArray(data['follower-recent'])) {
                            data['follower-recent'].forEach(f => {
                                if (f && f.name) {
                                    combinedEvents.push({
                                        type: 'Follow',
                                        name: f.name,
                                        extra: 'Nuevo seguidor',
                                        date: f.createdAt ? new Date(f.createdAt).getTime() : 0
                                    });
                                }
                            });
                        }
                    }
                } catch (sessErr) {
                    console.warn("Error fetching SE sessions:", sessErr);
                }

                // 2. Obtener actividades recientes (si las hay)
                try {
                    const actsRes = await fetch(`https://api.streamelements.com/kappa/v2/activities/${this.channelId}?limit=30`, {
                        headers: { 
                            'Authorization': 'jwt ' + this.token,
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (actsRes.ok) {
                        const actsData = await actsRes.json();
                        const eventsArray = Array.isArray(actsData) ? actsData : (actsData.docs || []);
                        
                        eventsArray.forEach(doc => {
                            if (doc.type === 'follow' || doc.type === 'follower' || doc.type === 'subscriber') {
                                const formatted = this.formatEvent(doc);
                                formatted.date = doc.createdAt ? new Date(doc.createdAt).getTime() : 0;
                                combinedEvents.push(formatted);
                            }
                        });
                    }
                } catch (actErr) {
                    console.warn("Error fetching SE activities:", actErr);
                }

                if (combinedEvents.length > 0) {
                    // Ordenar por fecha (el más reciente primero) y filtrar duplicados por tipo+nombre
                    combinedEvents.sort((a, b) => b.date - a.date);
                    
                    const unique = [];
                    const seen = new Set();
                    for (const ev of combinedEvents) {
                        const key = `${ev.type}-${ev.name.toLowerCase()}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            unique.push({ type: ev.type, name: ev.name, extra: ev.extra });
                        }
                        if (unique.length >= 5) break;
                    }

                    if (unique.length > 0) {
                        this.events = unique;
                        this.notifyUpdate();
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching StreamElements history:', error);
            if (this.events.length === 0) {
                this.events = [{ type: 'Error', name: 'Error API', extra: error.message }];
                this.notifyUpdate();
            }
        }
    }

    handleEvent(eventData) {
        if (!eventData || !eventData.type) return;
        
        const type = eventData.type;
        if (type === 'follower' || type === 'follow' || type === 'subscriber') {
            const newEvent = this.formatEvent(eventData);
            
            // Evitar duplicado inmediato
            this.events = this.events.filter(e => !(e.type === newEvent.type && e.name.toLowerCase() === newEvent.name.toLowerCase()));
            this.events.unshift(newEvent);
            
            // Mantener solo los 5 más recientes
            if (this.events.length > 5) {
                this.events.pop();
            }
            this.notifyUpdate();
        }
    }

    formatEvent(doc) {
        const type = (doc.type === 'follower' || doc.type === 'follow') ? 'Follow' : 'Sub';
        const data = doc.data || doc;
        const name = data.displayName || data.username || doc.name || 'Usuario';
        let extra = 'Nuevo seguidor';

        if (type === 'Sub') {
            const tier = String(data.tier || '');
            if (tier.toLowerCase() === 'prime' || tier === '0') {
                extra = 'Suscripción Prime';
            } else if (tier === '1000' || tier === '1') {
                extra = 'Suscripción Tier 1';
            } else if (tier === '2000' || tier === '2') {
                extra = 'Suscripción Tier 2';
            } else if (tier === '3000' || tier === '3') {
                extra = 'Suscripción Tier 3';
            } else {
                extra = 'Nueva suscripción';
            }
        }

        return { type, name, extra };
    }

    notifyUpdate() {
        if (this.onUpdate) {
            this.onUpdate(this.events);
        }
        localStorage.setItem('se_events', JSON.stringify(this.events));
    }
}
