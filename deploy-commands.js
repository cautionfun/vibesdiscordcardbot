const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

const commands = [
  new SlashCommandBuilder()
    .setName('card')
    .setDescription('Search Card from Vibes.')
    .addStringOption(option => option.setName('query')
      .setDescription('Card name')
      .setRequired(true)),
  new SlashCommandBuilder()
    .setName('cardart')
    .setDescription('Search Card Art from Vibes.')
    .addStringOption(option => option.setName('query')
      .setDescription('Card name')
      .setRequired(true)),
]
        .map(command => command.toJSON());

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
})();
