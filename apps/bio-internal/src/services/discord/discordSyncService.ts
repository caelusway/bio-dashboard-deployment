import { db } from '../../db/client';
import { discordChannels, discordMessages, daoEntities } from '../../db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { DiscordClient } from './discordClient';
import { Collection } from 'discord.js';
import type { Message, TextChannel, ThreadChannel } from 'discord.js';

interface ChannelMapping {
  channelId: string;
  daoSlug: string;
  channelName: string;
  category?: string; // Discord category name (e.g., "Molecule", "D1CkDAO")
  categoryId?: string; // Discord category ID
  isForum?: boolean; // True if this is a forum channel (will sync all threads)
}

export class DiscordSyncService {
  private discordClient: DiscordClient;
  private guildId: string;

  constructor(token: string, guildId: string) {
    this.discordClient = new DiscordClient(token);
    this.guildId = guildId;
  }

  /**
   * Sync all channels from Discord server to database
   */
  async syncChannels(channelMappings: ChannelMapping[]) {
    console.log(`📡 Syncing ${channelMappings.length} Discord channels...`);

    for (const mapping of channelMappings) {
      try {
        const channel = await this.discordClient.getChannel(mapping.channelId);
        
        if (!channel) {
          console.warn(`⚠️  Channel ${mapping.channelId} not found`);
          continue;
        }

        // Get DAO entity by slug
        const [dao] = await db
          .select()
          .from(daoEntities)
          .where(eq(daoEntities.slug, mapping.daoSlug))
          .limit(1);

        if (!dao) {
          console.warn(`⚠️  DAO with slug ${mapping.daoSlug} not found`);
          continue;
        }

        // Get category information from Discord
        const categoryName = mapping.category || 
          ('parent' in channel && channel.parent ? channel.parent.name : null);
        const categoryId = mapping.categoryId || 
          ('parent' in channel && channel.parent ? channel.parent.id : null);

        // Upsert channel
        const channelData = {
          channelId: mapping.channelId,
          daoId: dao.id,
          name: mapping.channelName,
          type: channel.isThread() ? 'thread' : 'text',
          category: categoryName,
          categoryId: categoryId,
          metadata: {
            parentId: channel.isThread() ? channel.parentId : null,
          },
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        };

        await db
          .insert(discordChannels)
          .values(channelData)
          .onConflictDoUpdate({
            target: discordChannels.channelId,
            set: {
              name: mapping.channelName,
              category: categoryName,
              categoryId: categoryId,
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            },
          });

        // Verify the channel was inserted/updated
        const [verifyChannel] = await db
          .select()
          .from(discordChannels)
          .where(eq(discordChannels.channelId, mapping.channelId))
          .limit(1);

        if (!verifyChannel) {
          throw new Error(`Failed to insert/update channel ${mapping.channelId} in database`);
        }

        console.log(`✅ Synced channel: ${mapping.channelName} (${mapping.channelId})`);
      } catch (error) {
        console.error(`❌ Error syncing channel ${mapping.channelId}:`, error);
      }
    }
  }

  /**
   * Sync messages from a specific channel (including forum threads if applicable)
   */
  async syncChannelMessages(channelId: string, options: { daysBack?: number; limit?: number; isForum?: boolean } = {}) {
    const daysBack = options.daysBack || 7;
    const limit = options.limit || 1000;
    const isForum = options.isForum || false;

    console.log(`📥 Syncing messages from channel ${channelId} (last ${daysBack} days)...`);
    
    // If this is a forum channel, sync all threads
    if (isForum) {
      return this.syncForumChannel(channelId, options);
    }

    try {
      // Get channel from database
      const [dbChannel] = await db
        .select()
        .from(discordChannels)
        .where(eq(discordChannels.channelId, channelId))
        .limit(1);

      if (!dbChannel) {
        throw new Error(`Channel ${channelId} not found in database. Run syncChannels first.`);
      }

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // Fetch messages from Discord
      const messages = await this.fetchMessagesRecursive(channelId, cutoffDate, limit);
      
      console.log(`📊 Found ${messages.size} messages to sync`);

      let syncedCount = 0;
      let skippedCount = 0;

      // Insert messages into database
      for (const [, message] of messages) {
        try {
          // Skip bot messages if needed
          if (message.author.bot && message.author.id !== message.client.user?.id) {
            skippedCount++;
            continue;
          }

          await db
            .insert(discordMessages)
            .values({
              discordId: message.id,
              channelId: dbChannel.id,
              content: message.content || null,
              authorId: message.author.id,
              authorUsername: message.author.username,
              attachments: message.attachments.map(att => ({
                id: att.id,
                url: att.url,
                name: att.name,
                contentType: att.contentType,
                size: att.size,
              })),
              embeds: message.embeds.map(embed => ({
                title: embed.title,
                description: embed.description,
                url: embed.url,
                color: embed.color,
              })),
              postedAt: message.createdAt,
            })
            .onConflictDoNothing();

          syncedCount++;
        } catch (error) {
          console.error(`❌ Error syncing message ${message.id}:`, error);
        }
      }

      // Update last synced timestamp
      await db
        .update(discordChannels)
        .set({ lastSyncedAt: new Date() })
        .where(eq(discordChannels.id, dbChannel.id));

      console.log(`✅ Synced ${syncedCount} messages, skipped ${skippedCount} bot messages`);

      return { syncedCount, skippedCount, totalMessages: messages.size };
    } catch (error) {
      console.error(`❌ Error syncing messages from channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Recursively fetch messages from Discord with pagination
   */
  private async fetchMessagesRecursive(
    channelId: string,
    cutoffDate: Date,
    maxMessages: number
  ): Promise<Collection<string, Message>> {
    const allMessages = new Collection<string, Message>();
    let lastMessageId: string | undefined;
    let shouldContinue = true;

    while (shouldContinue && allMessages.size < maxMessages) {
      const fetchOptions: any = { limit: 100 };
      if (lastMessageId) {
        fetchOptions.before = lastMessageId;
      }

      const messages = await this.discordClient.fetchMessages(channelId, fetchOptions);

      if (messages.size === 0) {
        break;
      }

      for (const [id, message] of messages) {
        // Stop if we've reached the cutoff date
        if (message.createdAt < cutoffDate) {
          shouldContinue = false;
          break;
        }

        allMessages.set(id, message);
        lastMessageId = id;

        // Stop if we've reached the max
        if (allMessages.size >= maxMessages) {
          shouldContinue = false;
          break;
        }
      }
    }

    return allMessages;
  }

  /**
   * Sync forum channel (all threads/topics)
   */
  async syncForumChannel(channelId: string, options: { daysBack?: number; limit?: number } = {}) {
    const daysBack = options.daysBack || 7;
    
    console.log(`💬 Syncing forum channel ${channelId} (including all topics/threads)...`);

    try {
      // Get channel from database
      const [dbChannel] = await db
        .select()
        .from(discordChannels)
        .where(eq(discordChannels.channelId, channelId))
        .limit(1);

      if (!dbChannel) {
        throw new Error(`Channel ${channelId} not found in database. Run syncChannels first.`);
      }

      // Fetch active and archived threads
      const activeThreads = await this.discordClient.getActiveThreads(channelId);
      const archivedThreads = await this.discordClient.getArchivedThreads(channelId, { limit: 100 });
      const allThreads = [...activeThreads, ...archivedThreads];

      console.log(`📊 Found ${allThreads.length} threads (${activeThreads.length} active, ${archivedThreads.length} archived)`);

      let totalSynced = 0;
      let totalSkipped = 0;

      // Sync messages from each thread
      for (const thread of allThreads) {
        try {
          console.log(`  📝 Syncing thread: ${thread.name} (${thread.id})`);
          
          const result = await this.syncThreadMessages(thread.id, dbChannel.id, daysBack);
          totalSynced += result.syncedCount;
          totalSkipped += result.skippedCount;
        } catch (error) {
          console.error(`  ❌ Error syncing thread ${thread.id}:`, error);
        }
      }

      // Update last synced timestamp
      await db
        .update(discordChannels)
        .set({ lastSyncedAt: new Date() })
        .where(eq(discordChannels.id, dbChannel.id));

      console.log(`✅ Forum sync complete: ${totalSynced} messages synced, ${totalSkipped} skipped`);

      return { syncedCount: totalSynced, skippedCount: totalSkipped, totalThreads: allThreads.length };
    } catch (error) {
      console.error(`❌ Error syncing forum channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Sync messages from a specific thread
   */
  private async syncThreadMessages(threadId: string, parentChannelDbId: string, daysBack: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const messages = await this.fetchMessagesRecursive(threadId, cutoffDate, 1000);
    
    let syncedCount = 0;
    let skippedCount = 0;

    for (const [, message] of messages) {
      try {
        // Skip bot messages if needed
        if (message.author.bot && message.author.id !== message.client.user?.id) {
          skippedCount++;
          continue;
        }

        await db
          .insert(discordMessages)
          .values({
            discordId: message.id,
            channelId: parentChannelDbId, // Link to parent forum channel
            content: message.content || null,
            authorId: message.author.id,
            authorUsername: message.author.username,
            attachments: message.attachments.map(att => ({
              id: att.id,
              url: att.url,
              name: att.name,
              contentType: att.contentType,
              size: att.size,
            })),
            embeds: message.embeds.map(embed => ({
              title: embed.title,
              description: embed.description,
              url: embed.url,
              color: embed.color,
            })),
            postedAt: message.createdAt,
          })
          .onConflictDoNothing();

        syncedCount++;
      } catch (error) {
        console.error(`    ❌ Error syncing message ${message.id}:`, error);
      }
    }

    return { syncedCount, skippedCount };
  }

  /**
   * Sync all channels and their messages
   */
  async syncAll(channelMappings: ChannelMapping[], daysBack: number = 7) {
    console.log(`🚀 Starting full Discord sync...`);

    // Step 1: Sync channels
    await this.syncChannels(channelMappings);

    // Step 2: Sync messages for each channel
    for (const mapping of channelMappings) {
      await this.syncChannelMessages(mapping.channelId, { 
        daysBack,
        isForum: mapping.isForum 
      });
    }

    console.log(`✅ Full Discord sync completed!`);
  }

  /**
   * Get message statistics for a channel
   */
  async getChannelStats(channelId: string, startDate: Date, endDate: Date) {
    const [dbChannel] = await db
      .select()
      .from(discordChannels)
      .where(eq(discordChannels.channelId, channelId))
      .limit(1);

    if (!dbChannel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    const messages = await db
      .select()
      .from(discordMessages)
      .where(
        and(
          eq(discordMessages.channelId, dbChannel.id),
          gte(discordMessages.postedAt, startDate),
          gte(endDate, discordMessages.postedAt)
        )
      )
      .orderBy(desc(discordMessages.postedAt));

    const uniqueAuthors = new Set(messages.map(m => m.authorId));
    const totalMessages = messages.length;
    const messagesWithAttachments = messages.filter(m => 
      Array.isArray(m.attachments) && m.attachments.length > 0
    ).length;

    return {
      totalMessages,
      uniqueAuthors: uniqueAuthors.size,
      messagesWithAttachments,
      averageMessagesPerDay: totalMessages / Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
      messages,
    };
  }

  async destroy() {
    await this.discordClient.destroy();
  }
}

