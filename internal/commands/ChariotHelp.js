const Embed = require('../../structures/ChariotEmbed');
const Logger = require('../../helpers/Logger');

class ChariotHelp {
    constructor() {
        this.type = 1
        this.name = 'help';
        this.permissions = ['embedLinks'];
        this.allowDMs = true;
        this.description = "A menu to get help on the bot's commands";
        this.defaultPermission = true;
        this.ephemeral = true;
        this.help = {
            message: 'Get either a general Help card or instructions for specified commands! Specifying a command is optional. If a command was specified its help text will show up.',
            usage: 'help [command]',
            example: ['help', 'help command'],
            inline: true
        }
        this.options = [{
            "name": "command",
            "description": "A specific command to get help for",
            "type": 3,
            "required": false
        }]
    }

    async slash(interaction, data, chariot) {

        if (!data.options || !data.options.length) {
            const commandNames = chariot.commands.filter((cmnds) => !cmnds.owner).filter((cmnds) => (cmnds.hasOwnProperty('help')) ? ((cmnds.help.visible === undefined) ? true : !(cmnds.help.visible === false)) : true).map((cmnds) => '`' + cmnds.name + '`');

            let em = new Embed()
                .setColor(chariot.chariotOptions.chariotConfig.primaryColor || 'RANDOM')
                .setTitle('Command Help')
                .setDescription(`Get detailed command instructions for any command!\n You can also specify a command!`)
                .addField('Commands', commandNames.join(', '));

            return interaction.createMessage({ embed: em });

        } else {
            const foundCommand = chariot.commands.get(data.options[0].value) || chariot.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(data.options[0].value));

            if (!foundCommand) {
                let em = new Embed()
                    .setColor('RED')
                    .setTitle(`Couldn't find command **${data.options[0].value}**!`);
                return interaction.createMessage({ embed: em });
            }

            if (foundCommand && !foundCommand.help) {
                let em = new Embed()
                    .setColor('RED')
                    .setDescription(`Unfortunately command **${foundCommand.name}** has no integrated help text yet.`);
                return interaction.createMessage({ embed: em });
            }

            const helpEmbed = new Embed();

            helpEmbed.setColor(chariot.chariotOptions.chariotConfig.primaryColor || 'RANDOM');
            helpEmbed.setTitle(`**${foundCommand.name}** Help`);
            helpEmbed.setDescription(foundCommand.help.message || 'No help description available');
            helpEmbed.addField('Usage', (foundCommand.help.usage) ? `\`/${foundCommand.help.usage}\`` : 'No usage available', foundCommand.help.inline);

            let helpArray = [];
            let exampleText = '';

            if (Array.isArray(foundCommand.help.example)) {
                helpArray = foundCommand.help.example.map((helpItem) => `\`/${helpItem}\``);
                exampleText = helpArray.join(', ');
            } else {
                exampleText = `\`/${foundCommand.help.example}\``;
            }

            helpEmbed.addField(Array.isArray(foundCommand.help.example) ? 'Examples' : 'Example', exampleText, foundCommand.help.inline);

            if (foundCommand.aliases && foundCommand.aliases.length) {
                const commandAliases = foundCommand.aliases.map((alias) => `\`${alias}\``);
                helpEmbed.addField('Aliases', commandAliases.join(', '), false);
            }

            return interaction.createMessage({ embed: helpEmbed });
        }
    }
}

module.exports = new ChariotHelp();
