import BaseCommand from './BaseCommand.js';

/**
 * VoteCommand - Permite a los espectadores votar en las encuestas de juegos en pantalla
 * Uso: !voto 1 | !voto 2 | !voto 3 | !votar 1/2/3
 */
export default class VoteCommand extends BaseCommand {
    constructor() {
        super(['!voto', '!votar', '!vote']);
        this.cooldowns = new Map();
        this.COOLDOWN_MS = 10000; // 10 segundos
    }

    execute(context) {
        const { username, args, emitChatResponse } = context;

        const now = Date.now();
        const lastUsed = this.cooldowns.get(username) || 0;
        if (now - lastUsed < this.COOLDOWN_MS) return;

        const choice = (args[0] || '').trim().toLowerCase();
        let targetKey = null;

        if (choice === '1' || choice.includes('mafia') && !choice.includes('2')) {
            targetKey = 'mafia';
        } else if (choice === '2' || choice.includes('mafia2') || choice.includes('mafia 2')) {
            targetKey = 'mafia2';
        } else if (choice === '3' || choice.includes('uncharted')) {
            targetKey = 'uncharted';
        }

        if (!targetKey) {
            emitChatResponse(`🗳️ @${username}, para votar usa: !voto 1, !voto 2 o !voto 3.`);
            return;
        }

        this.cooldowns.set(username, now);

        // Emitir voto al bus del overlay de votaciones (0 ms)
        try {
            const bus = new BroadcastChannel('stream_master_dock_bus');
            bus.postMessage({
                type: 'dock:voteAdd',
                data: { gameKey: targetKey, username },
                timestamp: Date.now()
            });
            localStorage.setItem('mithands_dock_event', JSON.stringify({
                type: 'dock:voteAdd',
                data: { gameKey: targetKey, username },
                timestamp: Date.now()
            }));
        } catch (e) {}

        emitChatResponse(`🗳️ ¡@${username} ha votado por la Opción ${choice}! (+5 XP)`);
    }
}
