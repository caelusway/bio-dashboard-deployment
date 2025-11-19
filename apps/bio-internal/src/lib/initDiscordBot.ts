/**
 * Initialize Discord Bot for Real-time Message Sync
 */

import { DiscordBot } from '../services/discord/discordBot';
import { env } from '../config/env';

let discordBot: DiscordBot | null = null;

export async function initializeDiscordBot() {
  if (discordBot) {
    console.log('⚠️ Discord bot already initialized');
    return discordBot;
  }

  try {
    console.log('🚀 Initializing Discord bot for real-time message sync...');
    
    discordBot = new DiscordBot(env.DISCORD_BOT_TOKEN as string, env.DISCORD_GUILD_ID as string);
    await discordBot.start();
    
    console.log('✅ Discord bot initialized and listening for messages');
    
    return discordBot;
  } catch (error) {
    console.error('❌ Failed to initialize Discord bot:', error);
    throw error;
  }
}

export async function stopDiscordBot() {
  if (discordBot) {
    await discordBot.stop();
    discordBot = null;
  }
}

export function getDiscordBot() {
  return discordBot;
}

