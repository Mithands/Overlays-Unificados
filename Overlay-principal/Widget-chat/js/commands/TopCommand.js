import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';

export default class TopCommand extends BaseCommand {
    constructor() {
        super('top', [
            'leaderboard',
            'ranking',
            'topxp',
            'topmes',
            'topseason',
            'topmensual',
            'toplurk',
            'topracha',
            'topstreak',
            'topstreaks',
            'toptiempo',
            'toptime'
        ]);
    }

    async execute({ args, message, services }) {
        if (!services.xp) return;

        const cmdTrigger = (message || '').slice(1).trim().split(/\s+/)[0].toLowerCase();
        const subArg = (args && args[0]) ? args[0].toLowerCase() : '';

        // Nombres de meses en español
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        const currentMonthIdx = new Date().getMonth();
        const currentMonthName = monthNames[currentMonthIdx] || 'Mes';

        // Determinar categoría del Top
        let category = 'xp';

        if (
            cmdTrigger === 'topmes' ||
            cmdTrigger === 'topseason' ||
            cmdTrigger === 'topmensual' ||
            ['mes', 'month', 'mensual', 'season', 'temporada'].includes(subArg)
        ) {
            category = 'mes';
        } else if (
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

        if (category === 'mes') {
            const leaderboard = await services.xp.getMonthlyXPLeaderboard(3);
            if (!leaderboard || leaderboard.length === 0) {
                EventManager.emit('ui:systemMessage', `🏆 Aún no hay datos de la Liga de ${currentMonthName}.`);
                return;
            }

            const parts = leaderboard.map((entry, index) => {
                const medal = medals[index] || `#${index + 1}`;
                return `${medal} ${entry.username} (${entry.xp.toLocaleString()} XP)`;
            });

            EventManager.emit('ui:systemMessage', `🏆 TOP ${currentMonthName.toUpperCase()} (Liga Mensual): ${parts.join(' | ')}`);
        } else if (category === 'lurk') {
            const leaderboard = await services.xp.getWatchTimeLeaderboard(3);
            if (!leaderboard || leaderboard.length === 0) {
                EventManager.emit('ui:systemMessage', '⏱️ Aún no hay datos de tiempo acumulado de seguidores.');
                return;
            }

            const parts = leaderboard.map((entry, index) => {
                const medal = medals[index] || `#${index + 1}`;
                return `${medal} ${entry.username} (${entry.formatted})`;
            });

            EventManager.emit('ui:systemMessage', `⏱️ TOP TIEMPO (Seguidores): ${parts.join(' | ')}`);
        } else if (category === 'racha') {
            const leaderboard = await services.xp.getStreakLeaderboard(3);
            if (!leaderboard || leaderboard.length === 0) {
                EventManager.emit('ui:systemMessage', '🔥 Aún no hay datos de rachas activas de seguidores.');
                return;
            }

            const parts = leaderboard.map((entry, index) => {
                const medal = medals[index] || `#${index + 1}`;
                return `${medal} ${entry.username} (${entry.streakDays}d)`;
            });

            EventManager.emit('ui:systemMessage', `🔥 TOP RACHAS (Seguidores): ${parts.join(' | ')}`);
        } else {
            // Por defecto: Top XP / Nivel
            const leaderboard = await services.xp.getXPLeaderboard(3);
            if (!leaderboard || leaderboard.length === 0) {
                EventManager.emit('ui:systemMessage', '🏆 Aún no hay datos de ranking de XP de seguidores.');
                return;
            }

            const parts = leaderboard.map((entry, index) => {
                const medal = medals[index] || `#${index + 1}`;
                return `${medal} ${entry.username} (Lvl ${entry.level})`;
            });

            EventManager.emit('ui:systemMessage', `🏆 TOP 3 XP (Seguidores): ${parts.join(' | ')}`);
        }
    }
}
