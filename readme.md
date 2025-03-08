# Discord Cleanup

**Discord Cleanup** is a versatile bot designed to help manage message spam in Discord channels. It provides simple commands to delete multiple messages at once, making it easy to keep your channels organized and clutter-free.

## Features

- **Bulk Message Deletion**: Delete a specified number of recent messages
- **Cleanup Until Marker**: Delete all messages up to a specific "good" message
- **Dual Command Support**: Use both slash commands (/) and prefix commands (!)
- **Authorized Users**: Limit who can use the cleanup commands
- **Legacy Message Support**: Can delete messages older than 14 days
- **Interactive Setup**: Easy configuration with guided setup

## Why Use Discord Cleanup?

Discord's built-in message management can be tedious when dealing with large amounts of spam. This bot allows you to quickly clean up messages without having to delete them one by one, and can even work with messages older than Discord's 14-day bulk deletion limit.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v16.9.0 or higher
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A Discord account with a server you manage

### Quick Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/djdarcy/discord-cleanup.git
   cd discord-cleanup
   ```

2. **Install dependencies first**:
   ```bash
   npm install
   ```

3. **Run the interactive setup script**:
   ```bash
   node setup.js
   ```
   
   Or with npm:
   ```bash
   npm run setup
   ```
   
   The interactive setup script will:
   - Check your Node.js version compatibility
   - Guide you through creating a config.json file with your:
     - Discord User ID (for authorization)
     - Command prefix settings
     - Other configuration options
   - Help you set up your Discord bot token and create the .env file
   - Provide detailed instructions for inviting the bot to your server

4. **Start the bot**:
   ```bash
   npm start
   ```
   
   Or directly:
   ```bash
   node discord-message-cleaner.js
   ```

### Manual Setup

If you prefer to set up manually:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create a configuration file**:
   Create a file named `config.json` with the following content:
   ```json
   {
     "prefix": "!",
     "authorizedUsers": ["YOUR_DISCORD_USER_ID"],
     "deleteConfirmationTimeout": 5000
   }
   ```

3. **Set up your Discord bot token**:
   Create a `.env` file with:
   ```
   DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
   ```

4. **Start the bot**:
   ```bash
   node bot-cleaner.js
   ```

## Creating a Discord Bot

To use this application, you need to create a Discord bot:

1. **Create a new application**:
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Navigate to the "Bot" section
   - Click "Add Bot"

2. **Configure bot permissions and intents**:
   - In the Bot section, under "Privileged Gateway Intents", enable all three intents:
     - Presence Intent
     - Server Members Intent (optional but recommended)
     - Message Content Intent (this one is necessary!)
   - Click "Save Changes" at the bottom of the page

3. **Get your bot token**:
   - In the Bot section, click "Reset Token" or "Copy" under the token section
   - This token will be used in the `.env` file

4. **Invite your bot to your server**:
   - Go to OAuth2 → URL Generator
   - Under "SCOPES" section, check these boxes:
     - `bot`
     - `applications.commands`
   - Under "BOT PERMISSIONS" section, select:
     - Read Messages/View Channels
     - Send Messages
     - Send Messages in Threads
     - Manage Messages (essential for deleting messages)
     - Read Message History
     - Use Slash Commands
   - Copy the generated URL and open it in your browser
   - Select your server from the dropdown
   - Click "Authorize"
   - Complete the CAPTCHA if prompted

## Running the Bot

After completing the setup, you can start the bot:

```bash
npm start
```

Or directly:
```bash
node discord-message-cleaner.js
```

You should see output similar to:
```
Configuration loaded from config.json
Logged in as YourBotName#1234
Started refreshing application (/) commands.
Successfully reloaded application (/) commands.
```

**Note:** You might see a deprecation warning about "ephemeral" options when using slash commands. This is just a warning and doesn't affect functionality. The bot will work normally.

## Bot Commands

### Using Slash Commands (Modern Approach)

- `/clean <amount>` - Delete a specified number of recent messages (max 100)
- `/cleanuntil <messageID>` - Delete all messages up to a specific message ID
- `/help` - Display help information about the bot

### Using Prefix Commands (Traditional Approach)

- `!clean <amount>` - Delete a specified number of recent messages (max 100)
- `!cleanuntil <messageID>` - Delete all messages up to a specific message ID
- `!help` - Display help information about the bot

### How to Get a Message ID

To use the `cleanuntil` command, you need to get the ID of the "good" message you want to keep:

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode

2. Right-click on any message and select "Copy ID"

3. Use this ID with the command:
   - `/cleanuntil <paste-id-here>` or `!cleanuntil <paste-id-here>`

## Troubleshooting

### Bot not responding to commands

- **Check the Message Content Intent**: This is the most common issue. Make sure you've enabled the "MESSAGE CONTENT INTENT" in the Bot settings on the Discord Developer Portal.
- **Verify your User ID**: Ensure your Discord User ID is correctly added to the `authorizedUsers` list in `config.json`.
- **Check bot permissions**: The bot must have the "Manage Messages" permission in the channel.
- **Check the bot's status**: Make sure the bot is online and in the correct channel.
- **Check console for errors**: Run the bot with `npm start` and check for any error messages in the console.

### Slash commands not appearing

- **Wait for registration**: It can take up to an hour for new slash commands to register globally.
- **Check the applications.commands scope**: Make sure you selected the `applications.commands` scope when inviting the bot.
- **Try reinviting the bot**: Remove the bot from your server and reinvite it with the correct permissions.
- **Check for slash command conflicts**: Other bots might be using the same command names.

### Error when deleting older messages

- **14-day limitation**: Discord has a 14-day limit for bulk deletion. The bot attempts to delete older messages individually, which may be slower.
- **Permission issues**: The bot needs "Manage Messages" permission for the channel.
- **Rate limiting**: If you're deleting many messages, Discord might rate-limit the bot. Wait a few minutes and try again.
- **Very old messages**: Some very old messages might fail to delete due to Discord API limitations.

## Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support Development

If you find this project useful, please consider supporting its development!

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/djdarcy)

## License

Discord Cleanup, Copyright (C) 2025 Dustin Darcy

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see [http://www.gnu.org/licenses/](http://www.gnu.org/licenses/).
