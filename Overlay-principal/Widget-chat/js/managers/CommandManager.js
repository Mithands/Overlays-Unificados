import EventManager from '../utils/EventEmitter.js';

/**
 * CommandManager - Gestión modular de comandos de chat
 */
export default class CommandManager {
    constructor(services, config) {
        this.services = services; // { xp, achievements, etc }
        this.config = config;
        this.commands = new Map();

        this._setupEventListeners();
    }

    /**
     * Registra un comando
     * @param {BaseCommand} commandInstance 
     */
    registerCommand(commandInstance) {
        this.commands.set(commandInstance.name, commandInstance);
        if (commandInstance.aliases) {
            commandInstance.aliases.forEach(alias => {
                this.commands.set(alias, commandInstance);
            });
        }
        if (this.config.DEBUG) {
            console.log(`🤖 Command registered: !${commandInstance.name}`);
        }
    }

    _setupEventListeners() {
        EventManager.on('chat:messageReceived', (data) => {
            this.handleMessage(data);
        });
    }

    handleMessage({ username, message }) {
        if (!message.startsWith('!')) return;

        // Usar regex para dividir por cualquier espacio en blanco y eliminar entradas vacías
        const args = message.slice(1).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const command = this.commands.get(commandName);

        if (command) {
            if (this.config.DEBUG) {
                console.log(`⚡ Executing command: !${commandName} by ${username}`);
            }
            try {
                const result = command.execute({
                    username,
                    args,
                    services: this.services,
                    message,
                    config: this.config
                });
                if (result instanceof Promise) {
                    result.catch(error => {
                        console.error(`❌ Error in async command !${commandName}:`, error);
                    });
                }
            } catch (error) {
                console.error(`❌ Error executing command !${commandName}:`, error);
            }
        }
    }
}
