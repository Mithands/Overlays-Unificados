import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';

export default class HelpCommand extends BaseCommand {
    constructor() {
        super('ayuda', ['commands', 'comandos', 'help']);
    }

    execute({ username }) {
        const commands = [
            '!nivel [@user]',
            '!top (o !topxp, !toplurk, !topracha)',
            '!racha [@user]',
            '!logros',
            '!stats',
            '!emotes',
            '!uptime'
        ];
        
        const message = `@${username} -> Comandos: ${commands.join(', ')}`;
        EventManager.emit('ui:systemMessage', message);
    }
}
