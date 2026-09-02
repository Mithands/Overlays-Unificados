import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';

export default class StreakCommand extends BaseCommand {
    constructor() {
        super('racha', ['streak', 'dias']);
    }

    execute({ username, args, services }) {
        if (!services.xp) return;

        let targetUser = username;
        if (args && args[0]) {
            targetUser = args[0].replace(/^@/, '').trim().toLowerCase();
        }

        const userData = services.xp.getUserData(targetUser);
        const streakDays = userData.streakDays || 0;
        const isSelf = targetUser.toLowerCase() === username.toLowerCase();
        const displayTarget = isSelf ? `@${username}` : `@${username} ➔ @${targetUser}`;
        
        let message = '';
        if (streakDays === 0) {
            message = `${displayTarget} -> ${isSelf ? 'No tienes' : 'No tiene'} racha activa actualmente.`;
        } else {
            const multiplier = services.xp.streakManager 
                ? services.xp.streakManager.getStreakMultiplier(streakDays) 
                : 1;
                
            message = `${displayTarget} -> 🔥 Racha: ${streakDays} días consecutivos (Bono x${multiplier.toFixed(1)}) | Mejor racha: ${userData.bestStreak || streakDays}d`;
        }

        EventManager.emit('ui:systemMessage', message);
    }
}
