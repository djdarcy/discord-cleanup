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
 * Discord Message Cleaner Bot - Setup Script
 * 
 * Interactive setup script to help users configure the bot
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// ASCII art banner
console.log(`${colors.cyan}
 ____  _                       _    ____ _                                
|  _ \\(_)___  ___ ___  _ __ __| |  / ___| | ___  __ _ _ __  _   _ _ __   
| | | | / __|/ __/ _ \\| '__/ _\` | | |   | |/ _ \\/ _\` | '_ \\| | | | '_ \\  
| |_| | \\__ \\ (_| (_) | | | (_| | | |___| |  __/ (_| | | | | |_| | |_) | 
|____/|_|___/\\___\\___/|_|  \\__,_|  \\____|_|\\___|\\__,_|_| |_|\\__,_| .__/  
                                                                 |_|     
${colors.reset}`);

console.log(`${colors.bright}Welcome to the Discord Cleanup Bot Setup!${colors.reset}`);
console.log('This script will guide you through the following steps:');
console.log('1. Installing required dependencies');
console.log('2. Creating your bot configuration (command prefix, authorized users)');
console.log('3. Setting up your Discord bot token');
console.log('4. Instructions for inviting the bot to your server\n');

console.log(`${colors.yellow}This setup process will create two files:${colors.reset}`);
console.log('- config.json: Contains your command settings and authorized users');
console.log('- .env: Contains your Discord bot token (keep this secure!)\n');

console.log('Press Ctrl+C at any time to cancel the setup.\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
console.log(`${colors.cyan}Node.js version:${colors.reset} ${nodeVersion}`);
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);

if (majorVersion < 16) {
  console.log(`${colors.red}Error: Node.js version 16.9.0 or higher is required.${colors.reset}`);
  console.log('Please upgrade your Node.js installation and try again.');
  process.exit(1);
}

// Check for npm
try {
  const npmVersion = execSync('npm --version').toString().trim();
  console.log(`${colors.cyan}npm version:${colors.reset} ${npmVersion}\n`);
} catch (error) {
  console.log(`${colors.red}Error: npm is not installed or not in your PATH.${colors.reset}`);
  console.log('Please install npm and try again.');
  process.exit(1);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promise-based question function
function question(query) {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}

// Step 1: Install dependencies
async function installDependencies() {
  console.log(`${colors.yellow}Step 1: Installing dependencies...${colors.reset}`);
  console.log('The bot requires the following npm packages:');
  console.log('- discord.js: The official Discord API library');
  console.log('- dotenv: For managing environment variables\n');
  
  const confirm = await question('Would you like to install these dependencies now? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log(`${colors.yellow}Dependencies installation skipped.${colors.reset}`);
    console.log('You can install them manually with: npm install');
    const proceed = await question('Continue with configuration anyway? (y/n): ');
    return proceed.toLowerCase() === 'y';
  }
  
  console.log('\nInstalling dependencies. This might take a minute...');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log(`${colors.green}Dependencies installed successfully.${colors.reset}\n`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Failed to install dependencies:${colors.reset}`, error.message);
    console.log('You can try to install them manually with: npm install');
    const answer = await question('Do you want to continue with configuration anyway? (y/n): ');
    return answer.toLowerCase() === 'y';
  }
}

// Step 2: Configure bot settings
async function configureBotSettings() {
  console.log(`${colors.yellow}Step 2: Bot configuration${colors.reset}`);
  console.log('Let\'s set up your bot configuration...\n');
  
  // Get command prefix
  let prefix = await question('Enter the command prefix for text commands (default is "!"): ');
  if (!prefix.trim()) prefix = '!';
  
  // Instructions for finding Discord User ID
  console.log('\n=== How to Find Your Discord User ID ===');
  console.log('1. Open Discord settings (gear icon in the bottom left)');
  console.log('2. Go to "Advanced" in the left sidebar');
  console.log('3. Enable "Developer Mode"');
  console.log('4. Close settings');
  console.log('5. Right-click on your username anywhere in Discord');
  console.log('6. Select "Copy ID" from the menu');
  console.log('This gives you a long number that is your unique Discord User ID.\n');
  
  // Get primary authorized user
  let authorizedUser = '';
  while (!authorizedUser) {
    authorizedUser = await question('Enter your Discord User ID (required to use the bot): ');
    if (!/^\d+$/.test(authorizedUser)) {
      console.log(`${colors.red}Invalid User ID. User ID should contain only numbers.${colors.reset}`);
      console.log('Right-click your username in Discord (with Developer Mode enabled) and select "Copy ID".');
      authorizedUser = '';
    }
  }
  
  // Get additional authorized users
  const additionalUsersInput = await question('Enter additional authorized User IDs (comma separated, or leave empty): ');
  let additionalUsers = [];
  
  if (additionalUsersInput.trim()) {
    const ids = additionalUsersInput.split(',').map(id => id.trim());
    additionalUsers = ids.filter(id => /^\d+$/.test(id));
    
    if (additionalUsers.length < ids.length) {
      console.log(`${colors.yellow}Warning: Some IDs were invalid and will be ignored.${colors.reset}`);
    }
  }
  
  // Get confirmation timeout
  let timeoutStr = await question('Enter timeout (in ms) for confirmation messages before auto-delete (default is 5000): ');
  let timeout = 5000;
  if (timeoutStr.trim()) {
    const parsedTimeout = parseInt(timeoutStr, 10);
    if (!isNaN(parsedTimeout) && parsedTimeout > 0) {
      timeout = parsedTimeout;
    } else {
      console.log(`${colors.yellow}Invalid timeout value. Using default (5000ms).${colors.reset}`);
    }
  }
  
  // Combine all authorized users
  const allAuthorizedUsers = [authorizedUser, ...additionalUsers];
  
  // Create config object
  const config = {
    prefix,
    authorizedUsers: allAuthorizedUsers,
    deleteConfirmationTimeout: timeout
  };
  
  // Save config to file
  fs.writeFileSync(
    path.join(__dirname, 'config.json'),
    JSON.stringify(config, null, 2)
  );
  
  console.log(`${colors.green}Configuration saved to config.json${colors.reset}\n`);
  return true;
}

// Step 3: Set up bot token
async function setupBotToken() {
  console.log(`${colors.yellow}Step 3: Bot token${colors.reset}`);
  
  console.log('\n=== How to Create a Discord Bot and Get Your Token ===');
  console.log('1. Go to the Discord Developer Portal: https://discord.com/developers/applications');
  console.log('2. Click the "New Application" button in the top right');
  console.log('3. Give your application a name (e.g., "Message Cleanup Bot")');
  console.log('4. Click on "Bot" in the left sidebar');
  console.log('5. Click "Add Bot" and confirm');
  console.log('6. Under the "TOKEN" section, click "Reset Token" or "Copy"');
  console.log('   (You might need to confirm with your password)');
  console.log('7. The token will only be shown ONCE, so copy it immediately');
  console.log('8. Keep this token secure - anyone with this token can control your bot!\n');
  
  let token = '';
  while (!token) {
    token = await question('Enter your Discord Bot Token: ');
    if (!token.trim()) {
      console.log(`${colors.red}Token cannot be empty.${colors.reset}`);
    }
  }
  
  // Create .env file with token
  fs.writeFileSync(
    path.join(__dirname, '.env'),
    `DISCORD_TOKEN=${token}\n`
  );
  
  console.log(`${colors.green}Bot token saved to .env file${colors.reset}\n`);
  return true;
}

// Step 4: Display instructions for inviting the bot
function displayInviteInstructions() {
  console.log(`${colors.yellow}Step 4: Configuring Bot Permissions and Inviting to Server${colors.reset}`);
  
  console.log('\n=== Part 1: Enable Required Gateway Intents ===');
  console.log('1. Go to the Discord Developer Portal: https://discord.com/developers/applications');
  console.log('2. Select your application');
  console.log('3. Click on "Bot" in the left sidebar');
  console.log('4. Scroll down to "Privileged Gateway Intents" section');
  console.log('5. Enable the following intents (toggle them ON):');
  console.log('   ✓ PRESENCE INTENT');
  console.log('   ✓ SERVER MEMBERS INTENT');
  console.log('   ✓ MESSAGE CONTENT INTENT  <-- This one is ESSENTIAL');
  console.log('6. Click "Save Changes" at the bottom of the page\n');
  
  console.log('=== Part 2: Configure OAuth2 URL and Invite Bot ===');
  console.log('1. Go to "OAuth2" → "URL Generator" in the left sidebar');
  console.log('2. Under "SCOPES" section, check these boxes:');
  console.log('   ✓ bot');
  console.log('   ✓ applications.commands');
  console.log('3. Under "BOT PERMISSIONS" section, select:');
  console.log('   ✓ Read Messages/View Channels');
  console.log('   ✓ Send Messages');
  console.log('   ✓ Send Messages in Threads');
  console.log('   ✓ Manage Messages            <-- Essential for deleting messages');
  console.log('   ✓ Read Message History');
  console.log('   ✓ Use Slash Commands');
  console.log('4. Scroll down and copy the generated URL');
  console.log('5. Paste the URL in your browser');
  console.log('6. Select your server from the dropdown');
  console.log('7. Click "Authorize"');
  console.log('8. Complete the CAPTCHA if prompted\n');
  
  console.log(`${colors.green}Setup complete!${colors.reset}`);
  console.log(`To start your bot, run: ${colors.cyan}npm start${colors.reset}`);
  console.log(`Or directly with: ${colors.cyan}node discord-message-cleaner.js${colors.reset}`);
  console.log(`Once your bot is running, you can use ${colors.cyan}!help${colors.reset} or ${colors.cyan}/help${colors.reset} to see available commands.\n`);
  
  console.log(`${colors.yellow}Important Note:${colors.reset} If your bot doesn't respond to commands, double-check that:`)
  console.log('1. You enabled the MESSAGE CONTENT INTENT in the bot settings');
  console.log('2. Your Discord User ID is correctly entered in config.json');
  console.log('3. The bot has the necessary permissions in your server');
  console.log('4. The bot is properly invited to the channels where you want to use it\n');
}

// Main setup function
async function runSetup() {
  try {
    // Execute setup steps in sequence
    const dependenciesInstalled = await installDependencies();
    if (!dependenciesInstalled) {
      console.log(`${colors.yellow}Skipping remaining setup steps. Please run setup again after installing dependencies.${colors.reset}`);
      process.exit(1);
    }
    
    await configureBotSettings();
    await setupBotToken();
    displayInviteInstructions();
    
    rl.close();
  } catch (error) {
    console.error(`${colors.red}Setup failed:${colors.reset}`, error);
    rl.close();
    process.exit(1);
  }
}

runSetup();
