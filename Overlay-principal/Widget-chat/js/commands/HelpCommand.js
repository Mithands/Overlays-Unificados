import BaseCommand from './BaseCommand.js';
import EventManager from '../utils/EventEmitter.js';

export default class HelpCommand extends BaseCommand {
    constructor() {
        super('ayuda', ['commands', 'comandos', 'help']);
    }

    execute({ username }) {
        const commands = [
            '!nivel [@user]',
            '!top (o !topmes, !topxp, !toplurk, !topracha)',
            '!racha [@user]',
            '!logros',
            '!voto 1|2|3',
            '!stats',
            '!emotes',
            '!uptime'
        ];
        
        const message = `@${username} -> Comandos: ${commands.join(', ')}`;
        EventManager.emit('ui:systemMessage', message);
    }
}
