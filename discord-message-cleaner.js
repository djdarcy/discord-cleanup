#!/usr/bin/env node
// Copyright (C) 2025 Dustin Darcy <ScarcityHypothesis.org>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

/**
 * Discord Message Cleaner Bot (Hybrid Command Version)
 * 
 * A utility bot that helps manage channel spam by:
 * 1. Deleting the last X messages in a channel
 * 2. Deleting all messages up to a specific "good" message
 * 
 * Supports both traditional prefix commands (!) and modern slash commands (/)
 * 
 * Version: 0.1.0
 */

const { Client, GatewayIntentBits, Partials, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// Load configuration
let config = {
  prefix: '!', // Default command prefix for text commands
  authorizedUsers: [], // This should be set in config.json
  deleteConfirmationTimeout: 5000 // Timeout for deletion confirmation messages (ms)
};

// Try to load config from file
const configPath = path.join(__dirname, 'config.json');
try {
  if (fs.existsSync(configPath)) {
    const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config = { ...config, ...fileConfig };
    console.log('Configuration loaded from config.json');
  } else {
    console.log('No config.json found, using default configuration');
    console.log('Please create a config.json file with your authorized users');
  }
} catch (error) {
  console.error('Error loading configuration:', error);
}

// Define the slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('clean')
    .setDescription('Delete a specified number of recent messages')
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),
  new SlashCommandBuilder()
    .setName('cleanuntil')
    .setDescription('Delete all messages up to a specific message')
    .addStringOption(option => 
      option.setName('messageid')
        .setDescription('ID of the message to keep (and delete everything newer)')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get information about the bot commands'),
  new SlashCommandBuilder()
    .setName('version')
    .setDescription('Show the bot version information')
];

// Register slash commands when the bot starts
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  try {
    // Register commands globally (may take up to an hour to propagate)
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands.map(command => command.toJSON()) },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error refreshing slash commands:', error);
  }
});

// Shared cleanup logic for both command types
async function cleanMessages(channel, amount, responseCallback) {
  try {
    // Fetch and delete messages
    const fetchedMessages = await channel.messages.fetch({ limit: amount });
    
    // Filter messages to handle the 14-day limitation
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recentMessages = fetchedMessages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
    const oldMessages = fetchedMessages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);
    
    let deletedCount = 0;
    
    // Bulk delete recent messages (less than 14 days old)
    if (recentMessages.size > 0) {
      await channel.bulkDelete(recentMessages, true);
      deletedCount += recentMessages.size;
    }
    
    // Handle older messages one by one (this is slower but works for older messages)
    for (const msg of oldMessages.values()) {
      try {
        await msg.delete();
        deletedCount++;
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (deleteErr) {
        console.error('Error deleting older message:', deleteErr);
        // Continue with other messages even if one fails
      }
    }
    
    // Provide response on completion
    await responseCallback(`Successfully deleted ${deletedCount} messages.`);
  } catch (error) {
    console.error('Error deleting messages:', error);
    await responseCallback('There was an error deleting messages. Some messages may be too old to delete in bulk.');
  }
}

// Shared cleanuntil logic for both command types
async function cleanUntilMessage(channel, targetMessageId, responseCallback) {
  try {
    let targetFound = false;
    let deletedCount = 0;
    let lastMessageId = null;
    
    // Continue fetching and deleting messages until target is found
    while (!targetFound) {
      // Fetch messages before the last one we've seen
      const options = { limit: 100 };
      if (lastMessageId) options.before = lastMessageId;
      
      const messages = await channel.messages.fetch(options);
      
      if (messages.size === 0) break; // No more messages
      
      // Update the last message ID for next fetch
      lastMessageId = messages.last().id;
      
      // Check if target message is in this batch
      if (messages.has(targetMessageId)) {
        targetFound = true;
        // Get all messages newer than the target
        const toDelete = messages.filter(msg => 
          msg.id !== targetMessageId && 
          msg.createdTimestamp > messages.get(targetMessageId).createdTimestamp
        );
        
        if (toDelete.size > 0) {
          // Filter messages to handle the 14-day limitation
          const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
          const recentToDelete = toDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);
          const oldToDelete = toDelete.filter(msg => msg.createdTimestamp <= twoWeeksAgo);
          
          // Bulk delete recent messages
          if (recentToDelete.size > 0) {
            await channel.bulkDelete(recentToDelete, true);
            deletedCount += recentToDelete.size;
          }
          
          // Handle older messages one by one
          for (const msg of oldToDelete.values()) {
            try {
              await msg.delete();
              deletedCount++;
              // Small delay to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (deleteErr) {
              console.error('Error deleting older message:', deleteErr);
              // Continue with other messages even if one fails
            }
          }
        }
        break;
      }
      
      // Filter messages to handle the 14-day limitation
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const recentMessages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
      const oldMessages = messages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);
      
      // Bulk delete recent messages (less than 14 days old)
      if (recentMessages.size > 0) {
        await channel.bulkDelete(recentMessages, true);
        deletedCount += recentMessages.size;
      }
      
      // Handle older messages one by one (this is slower but works for older messages)
      for (const msg of oldMessages.values()) {
        try {
          await msg.delete();
          deletedCount++;
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (deleteErr) {
          console.error('Error deleting older message:', deleteErr);
          // Continue with other messages even if one fails
        }
      }
      
      // Discord API rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Provide response on completion
    await responseCallback(
      targetFound 
        ? `Successfully deleted ${deletedCount} messages up to the target message.` 
        : 'Target message not found. Deleted all fetchable messages in the channel.'
    );
  } catch (error) {
    console.error('Error cleaning messages:', error);
    await responseCallback('There was an error deleting messages. Some messages may be too old to delete in bulk.');
  }
}

// Interaction handler for slash commands
client.on('interactionCreate', async interaction => {
  // Only process command interactions
  if (!interaction.isCommand()) return;
  
  // Check if user is authorized
  if (!config.authorizedUsers.includes(interaction.user.id)) {
          return interaction.reply({ 
        content: 'You are not authorized to use this bot.', 
        flags: [1 << 6] // Use flags instead of ephemeral: true (1 << 6 is the EPHEMERAL flag)
      });
  }

  // Check permissions
  if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
          return interaction.reply({ 
        content: 'I need "Manage Messages" permission to delete messages.', 
        flags: [1 << 6] 
      });
  }

  const { commandName } = interaction;

  // Command: clean (delete last X messages)
  if (commandName === 'clean') {
    const amount = interaction.options.getInteger('amount');
    
    // Defer the reply
    await interaction.deferReply({ ephemeral: true });
    
    // Execute the cleanup
    await cleanMessages(interaction.channel, amount, async (message) => {
      await interaction.editReply({ content: message, ephemeral: true });
    });
  }
  
  // Command: cleanuntil (delete messages until a specific message)
  else if (commandName === 'cleanuntil') {
    const targetMessageId = interaction.options.getString('messageid');
    
    if (!targetMessageId || !/^\d+$/.test(targetMessageId)) {
      return interaction.reply({ 
        content: 'Please provide a valid message ID of the "good" message to keep. Right-click on the message and select "Copy ID" to get it.', 
        flags: [1 << 6] 
      });
    }

    // Defer the reply
    await interaction.deferReply({ ephemeral: true });
    
    // Execute the cleanup
    await cleanUntilMessage(interaction.channel, targetMessageId, async (message) => {
      await interaction.editReply({ content: message, ephemeral: true });
    });
  }

  // Command: Help
  else if (commandName === 'help') {
    interaction.reply({
      content: `
**Discord Message Cleaner Bot Commands:**
- \`/clean [amount]\` or \`!clean [amount]\` - Deletes the specified number of recent messages (max 100)
- \`/cleanuntil [messageID]\` or \`!cleanuntil [messageID]\` - Deletes all messages up to (but not including) the specified message ID
- \`/help\` or \`!help\` - Shows this help message
- \`/version\` - Shows version information

Both slash commands (/) and prefix commands (!) are available for your convenience.
      `,
      flags: [1 << 6]
    });
  }
  
  // Command: Version
  else if (commandName === 'version') {
    const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    
    interaction.reply({
      content: `
**Discord Cleanup Bot v0.1.0**

- Node.js: ${process.version}
- Discord.js: v${packageInfo.dependencies['discord.js'].replace('^', '')}
- Repository: ${packageInfo.repository.url.replace('git+', '').replace('.git', '')}

Report issues: ${packageInfo.repository.url.replace('git+', '').replace('.git', '')}/issues
      `,
      flags: [1 << 6]
    });
  }
});

// Message event handler for prefix commands (!)
client.on('messageCreate', async (message) => {
  // Ignore messages from bots or messages that don't start with the prefix
  if (message.author.bot || !message.content.startsWith(config.prefix)) return;
  
  // Check if user is authorized
  if (!config.authorizedUsers.includes(message.author.id)) {
    return message.reply('You are not authorized to use this bot.');
  }

  // Check if bot has required permissions
  if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return message.reply('I need "Manage Messages" permission to delete messages.');
  }

  // Parse command and arguments
  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Command: Delete last X messages
  if (command === 'clean') {
    const amount = parseInt(args[0]);
    
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('Please provide a number between 1 and 100.');
    }

    try {
      // Delete the command message first
      await message.delete();
      
      // Execute the cleanup
      await cleanMessages(message.channel, amount, async (responseText) => {
        try {
          // Send confirmation and delete it after 5 seconds
          const reply = await message.channel.send(responseText);
          setTimeout(() => {
            reply.delete().catch(() => {
              // Silently ignore deletion errors
            });
          }, config.deleteConfirmationTimeout);
        } catch (err) {
          console.error('Error sending confirmation message:', err);
        }
      });
    } catch (error) {
      console.error('Error in clean command:', error);
    }
  }
  
  // Command: Delete messages until a specific message is found
  else if (command === 'cleanuntil') {
    const targetMessageId = args[0];
    
    if (!targetMessageId || !/^\d+$/.test(targetMessageId)) {
      return message.reply('Please provide a valid message ID of the "good" message to keep. Right-click on the message and select "Copy ID" to get it.');
    }

    try {
      // Delete the command message first
      await message.delete();
      
      // Execute the cleanup
      await cleanUntilMessage(message.channel, targetMessageId, async (responseText) => {
        try {
          // Send confirmation and delete it after 5 seconds
          const reply = await message.channel.send(responseText);
          setTimeout(() => {
            reply.delete().catch(() => {
              // Silently ignore deletion errors
            });
          }, 5000);
        } catch (err) {
          console.error('Error sending confirmation message:', err);
        }
      });
    } catch (error) {
      console.error('Error in cleanuntil command:', error);
    }
  }

  // Command: Help
  else if (command === 'help') {
    message.channel.send(`
**Discord Message Cleaner Bot Commands:**
- \`${config.prefix}clean [number]\` or \`/clean [amount]\` - Deletes the specified number of recent messages (max 100)
- \`${config.prefix}cleanuntil [messageID]\` or \`/cleanuntil [messageID]\` - Deletes all messages up to (but not including) the specified message ID
- \`${config.prefix}help\` or \`/help\` - Shows this help message
- \`${config.prefix}version\` or \`/version\` - Shows version information
    `);
  }
  
  // Command: Version
  else if (command === 'version') {
    const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    
    message.channel.send(`
**Discord Cleanup Bot v0.1.0**

- Node.js: ${process.version}
- Discord.js: v${packageInfo.dependencies['discord.js'].replace('^', '')}
- Repository: ${packageInfo.repository.url.replace('git+', '').replace('.git', '')}

Report issues: ${packageInfo.repository.url.replace('git+', '').replace('.git', '')}/issues
    `);
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);