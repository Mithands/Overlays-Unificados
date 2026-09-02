import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';

export default class TopCommand extends BaseCommand {
    constructor() {
        super('top', [
            'leaderboard',
            'ranking',
            'topxp',
            'toplurk',
            'topracha',
            'topstreak',
            'topstreaks',
            'toptiempo',
            'toptime'
        ]);
    }

    execute({ args, message, services }) {
        if (!services.xp) return;

        const cmdTrigger = (message || '').slice(1).trim().split(/\s+/)[0].toLowerCase();
        const subArg = (args && args[0]) ? args[0].toLowerCase() : '';

        // Determinar categoría del Top
        let category = 'xp';

        if (
            cmdTrigger === 'toplurk' ||
            cmdTrigger === 'toptiempo' ||
            cmdTrigger === 'toptime' ||
            ['lurk', 'tiempo', 'time', 'watchtime', 'horas', 'h'].includes(subArg)
        ) {
            category = 'lurk';
        } else if (
            cmdTrigger === 'topracha' ||
            cmdTrigger === 'topstreak' ||
            cmdTrigger === 'topstreaks' ||
            ['racha', 'rachas', 'streak', 'streaks', 'dias'].includes(subArg)
        ) {
            category = 'racha';
        }

        const medals = ['🥇', '🥈', '🥉'];

        if (category === 'lurk') {
            const leaderboard = services.xp.getWatchTimeLeaderboard(3);
            if (!leaderboard || leaderboard.length === 0) {
                EventManager.emit('ui:systemMessage', '⏱️ Aún no hay datos de tiempo acumulado.');
                return;
            }

            const parts = leaderboard.map((entry, index) => {
                const medal = medals[index] || `#${index + 1}`;
                return `${medal} ${entry.username} (${entry.formatted})`;
            });

            EventManager.emit('ui:systemMessage', `⏱️ TOP TIEMPO: ${parts.join(' | ')}`);
        } else if (category === 'racha') {
            const leaderboard = services.xp.getStreakLeaderboard(3);
            if (!leaderboard || leaderboard.length === 0) {
                EventManager.emit('ui:systemMessage', '🔥 Aún no hay datos de rachas activas.');
                return;
            }

            const parts = leaderboard.map((entry, index) => {
                const medal = medals[index] || `#${index + 1}`;
                return `${medal} ${entry.username} (${entry.streakDays}d)`;
            });

            EventManager.emit('ui:systemMessage', `🔥 TOP RACHAS: ${parts.join(' | ')}`);
        } else {
            // Por defecto: Top XP / Nivel
            const leaderboard = services.xp.getXPLeaderboard(3);
            if (!leaderboard || leaderboard.length === 0) {
                EventManager.emit('ui:systemMessage', '🏆 Aún no hay datos de ranking de XP.');
                return;
            }

            const parts = leaderboard.map((entry, index) => {
                const medal = medals[index] || `#${index + 1}`;
                return `${medal} ${entry.username} (Lvl ${entry.level})`;
            });

            EventManager.emit('ui:systemMessage', `🏆 TOP 3 XP: ${parts.join(' | ')}`);
        }
    }
}
