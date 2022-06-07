const Logger = require('../helpers/Logger');
const Collection = require('../helpers/Collection');
const Util = require('../helpers/Util');
const Embed = require('../structures/ChariotEmbed');
const juration = require('juration');

/**
 * This class handles the incoming messages and triggers commands if a valid command was issued
 */
class InteractionHandler {
    constructor(chariot) {
        this.chariot = chariot;
        this.cooldowns = new Collection();
        this.minimumPermissions = ['viewChannel', 'sendMessages'];
    }


    /**
     * This method handles interactions and checks their invoker for permissions and cooldowns.
     * If user passes checks, the command file will be checked for its instantiated properties and then executed.
     * @async
     * @param {Object} interaction The interaction object emitted from Discord 
     * @param {Chariot.Collection} commands A collection containing all registered commands 
     */
    async handle(interaction, commands) {
        const commandName       = interaction.data.name;
        const command           = commands.get(commandName) || commands.find(chariotCommand => chariotCommand.aliases && chariotCommand.aliases.includes(commandName));
        const chariotConfig     = this.chariot.chariotOptions.chariotConfig;
        const author            = interaction.user || interaction.member;

        /* Stop handling if no command was found */
        if (!command) return;

        /* Check if it is a DM */
        if (interaction.user && !command.allowDMs) return;

        /* Enable permission check for guild interactions */
        if (interaction.member) {

            /* Check if the bot has adequate permissions */
            const pendingPermissions = (!command.permissions) ? this.minimumPermissions : this.minimumPermissions.concat(command.permissions);
            let missingPermissions = [];

            for (let i = 0; i < pendingPermissions.length; i++) {
                if (!interaction.channel.permissionsOf(this.chariot.user.id).has(pendingPermissions[i])) {
                    missingPermissions.push(Util.formatPermission(pendingPermissions[i]));
                }
            }

            if (missingPermissions.length) {
                return interaction.createMessage(Util.getLocale(chariotConfig, "missingPermissions").replace("{command}", command.name).replace("{missingPermissions}", missingPermissions.join(', ')))
                    .catch((messageSendError) => {
                        Logger.warning('MUTED', `Can't send messages in #${interaction.channel.name} (${interaction.channel.id})`);
                    });
            }

            /* Check if the user has adequate permissions */
            const pendingUserPermissions = (!command.userPermissions) ? false : command.userPermissions;
            let missingUserPermissions = [];

            if (pendingUserPermissions) {
                for (let j = 0; j < pendingUserPermissions.length; j++) {
                    if (!interaction.member.permission.has(pendingUserPermissions[j])) {
                        missingUserPermissions.push(Util.formatPermission(pendingUserPermissions[j]));
                    }
                }
            }

            if (missingUserPermissions.length) {
                let em = new Embed()
                    .setColor('RED')
                    .setTitle(Util.getLocale(chariotConfig, "userPermissions", "title"))
                    .setDescription(Util.getLocale(chariotConfig, "userPermissions", "description").replace("{missingUserPermissions}", missingUserPermissions.join(', ')));
                return interaction.createMessage({ embed: em, flags: 64 }
                ).catch((embedSendError) => {
                    interaction.createMessage(Util.getLocale(chariotConfig, "userPermissions", "description").replace("{missingUserPermissions}", missingUserPermissions.join(', '))).catch((messageSendError) => {
                        Logger.warning('MUTED', `Can't send messages in #${interaction.channel.name} (${interaction.channel.id})`);
                    });
                });
            }
        }

        /* Check if the command is restricted to the bot owner */
        if (command.owner && !chariotConfig.owner.includes(author.id)) {
            return interaction.createMessage({ content: "This command can only be used by my developer", flags: 64 });
        }

        /* Check if an NSFW command is only used in an NSFW channel */
        if (interaction.member) {
            if (command.nsfw && !interaction.channel.nsfw) {
                let em = new Embed()
                    .setColor('RED')
                    .setTitle(Util.getLocale(chariotConfig, "nsfw").replace("{command}", command.name))
                return interaction.createMessage({ embed: em, flags: 64 }
                ).catch((embedSendError) => {
                    interaction.createMessage(Util.getLocale(chariotConfig, "nsfw").replace("{command}", command.name)).catch((messageSendError) => {
                        Logger.warning('MUTED', `Can't send messages in #${interaction.channel.name} (${interaction.channel.id})`);
                    });
                });
            }
        }

        /* Command Cooldowns */
        if (!this.cooldowns.has(command.name)) {
            this.cooldowns.set(command.name, new Collection());
        }

        const now = Date.now();
        const timestamps = this.cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 0) * 1000;

        if (timestamps.has(author.id)) {
            const expirationTime = timestamps.get(author.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                const timeLeftFormatted = juration.stringify(timeLeft, { format: 'long', units: 1 });

                let em = new Embed()
                    .setColor(chariotConfig.primaryColor || 'RANDOM')
                    .setTitle(Util.getLocale(chariotConfig, "cooldown").replace("{timeLeft}", Math.round(timeLeft)).replace("{timeLeftFormatted}", timeLeftFormatted).replace("{command}", command.name))
                return interaction.createMessage({ embed: em, flags: 64 }
                ).catch((embedSendError) => {
                    interaction.createMessage(Util.getLocale(chariotConfig, "cooldown").replace("{timeLeft}", Math.round(timeLeft)).replace("{timeLeftFormatted}", timeLeftFormatted).replace("{command}", command.name)).catch((messageSendError) => {
                        Logger.warning('MUTED', `Can't send messages in #${interaction.channel.name} (${interaction.channel.id})`);
                    });
                });
            }
        }

        timestamps.set(author.id, now);
        setTimeout(() => timestamps.delete(author.id), cooldownAmount);

        try {
            command.slash(interaction, interaction.data, this.chariot)
        } catch (chariotCommandExecutionError) {
            Logger.error('COMMAND EXECUTION ERROR', `Command ${command.name} couldn't be executed because of: ${chariotCommandExecutionError}`);
        }
    }
}

module.exports = InteractionHandler;
