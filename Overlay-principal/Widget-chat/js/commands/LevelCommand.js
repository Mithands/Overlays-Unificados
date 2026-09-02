import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';

export default class LevelCommand extends BaseCommand {
    constructor() {
        super('nivel', ['level', 'xp', 'rank', 'perfil', 'profile']);
    }

    execute({ username, args, services }) {
        if (!services.xp) return;

        // Determinar usuario objetivo (el emisor o el mencionado con @usuario)
        let targetUser = username;
        if (args && args[0]) {
            targetUser = args[0].replace(/^@/, '').trim().toLowerCase();
        }

        const xpInfo = services.xp.getUserXPInfo(targetUser);
        if (!xpInfo) {
            EventManager.emit('ui:systemMessage', `@${username} -> El usuario ${targetUser} aún no tiene registro de XP.`);
            return;
        }

        const isSelf = targetUser.toLowerCase() === username.toLowerCase();
        const displayTarget = isSelf ? `@${username}` : `@${username} ➔ @${targetUser}`;
        let message = `${displayTarget} -> Nivel ${xpInfo.level} (${xpInfo.title}) • XP: ${Math.floor(xpInfo.progress.xpInCurrentLevel)}/${Math.floor(xpInfo.progress.xpNeededForNext)}`;

        if (xpInfo.streakDays > 0) {
            message += ` • 🔥 Racha: ${xpInfo.streakDays}d (x${xpInfo.streakMultiplier})`;
        }

        if (xpInfo.monthlyRank) {
            message += ` • 🏆 Liga del Mes: #${xpInfo.monthlyRank} (${(xpInfo.monthlyXP || 0).toLocaleString()} XP)`;
        } else if (xpInfo.monthlyXP > 0) {
            message += ` • 🏆 Liga del Mes: ${(xpInfo.monthlyXP || 0).toLocaleString()} XP`;
        }

        EventManager.emit('ui:systemMessage', message);
    }
}
