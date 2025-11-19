/**
 * Discord Bot - Real-time Message Listener
 * 
 * This bot listens to all messages in configured channels and saves them to the database in real-time.
 * It runs continuously as a separate process.
 */

import { Client, GatewayIntentBits, Message, Events } from 'discord.js';
import { db } from '../../db/client';
import { discordChannels, discordMessages } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class DiscordBot {
  private client: Client;
  private token: string;
  private guildId: string;
  private trackedChannelIds: Set<string> = new Set();

  constructor(token: string, guildId: string) {
    this.token = token;
    this.guildId = guildId;
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for the bot
   */
  private setupEventHandlers() {
    this.client.on(Events.ClientReady, async () => {
      console.log(`✅ Discord bot logged in as ${this.client.user?.tag}`);
      await this.loadTrackedChannels();
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      await this.handleMessage(message);
    });

    this.client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
      if (newMessage.partial) {
        try {
          await newMessage.fetch();
        } catch (error) {
          console.error('❌ Error fetching partial message:', error);
          return;
        }
      }
      await this.handleMessage(newMessage as Message, true);
    });

    this.client.on(Events.Error, (error) => {
      console.error('❌ Discord bot error:', error);
    });
  }

  /**
   * Load tracked channels from database
   */
  private async loadTrackedChannels() {
    try {
      const channels = await db
        .select({ channelId: discordChannels.channelId })
        .from(discordChannels);

      this.trackedChannelIds = new Set(channels.map(c => c.channelId));
      
      console.log(`📡 Tracking ${this.trackedChannelIds.size} Discord channels for real-time sync`);
    } catch (error) {
      console.error('❌ Error loading tracked channels:', error);
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: Message, isUpdate: boolean = false) {
    // Ignore bot messages (except our own if needed)
    if (message.author.bot && message.author.id !== this.client.user?.id) {
      return;
    }

    // Only track messages from configured channels
    if (!this.trackedChannelIds.has(message.channelId)) {
      return;
    }

    try {
      // Get the database channel record
      const [dbChannel] = await db
        .select()
        .from(discordChannels)
        .where(eq(discordChannels.channelId, message.channelId))
        .limit(1);

      if (!dbChannel) {
        console.warn(`⚠️ Channel ${message.channelId} not found in database`);
        return;
      }

      // Prepare message data
      const messageData = {
        messageId: message.id,
        channelId: dbChannel.id,
        authorId: message.author.id,
        authorUsername: message.author.username,
        content: message.content || null,
        postedAt: message.createdAt,
        attachments: message.attachments.map(att => att.url),
        embeds: message.embeds.map(emb => emb.toJSON()),
        reactions: message.reactions.cache.map(r => ({
          emoji: r.emoji.name,
          count: r.count,
        })),
        threadId: message.channel.isThread() ? message.channel.id : null,
        threadName: message.channel.isThread() ? message.channel.name : null,
        metadata: {
          url: message.url,
          editedAt: message.editedAt?.toISOString() || null,
        },
      };

      // Upsert message (insert or update if exists)
      await db
        .insert(discordMessages)
        .values(messageData)
        .onConflictDoUpdate({
          target: discordMessages.messageId,
          set: {
            content: messageData.content,
            attachments: messageData.attachments,
            embeds: messageData.embeds,
            reactions: messageData.reactions,
            metadata: messageData.metadata,
            updatedAt: new Date(),
          },
        });

      const action = isUpdate ? '📝 Updated' : '💾 Saved';
      console.log(`${action} message from ${message.author.username} in ${dbChannel.name}`);
    } catch (error) {
      console.error('❌ Error saving message:', error);
    }
  }

  /**
   * Start the bot
   */
  async start() {
    try {
      await this.client.login(this.token);
    } catch (error) {
      console.error('❌ Failed to start Discord bot:', error);
      throw error;
    }
  }

  /**
   * Stop the bot
   */
  async stop() {
    await this.client.destroy();
    console.log('🛑 Discord bot stopped');
  }

  /**
   * Reload tracked channels (useful after adding new channels)
   */
  async reloadChannels() {
    await this.loadTrackedChannels();
  }
}

