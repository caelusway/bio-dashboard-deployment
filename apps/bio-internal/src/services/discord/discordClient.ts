import { Client, GatewayIntentBits, Collection, TextChannel, ThreadChannel } from 'discord.js';

export class DiscordClient {
  private client: Client;
  private isReady: boolean = false;

  constructor(token: string) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.client.once('ready', () => {
      console.log(`✅ Discord bot logged in as ${this.client.user?.tag}`);
      this.isReady = true;
    });

    this.client.login(token);
  }

  async waitForReady(): Promise<void> {
    if (this.isReady) return;
    
    return new Promise((resolve) => {
      this.client.once('ready', () => {
        this.isReady = true;
        resolve();
      });
    });
  }

  async getGuild(guildId: string) {
    await this.waitForReady();
    return this.client.guilds.cache.get(guildId) || await this.client.guilds.fetch(guildId);
  }

  async getChannel(channelId: string) {
    await this.waitForReady();
    return this.client.channels.cache.get(channelId) || await this.client.channels.fetch(channelId);
  }

  async fetchMessages(channelId: string, options: { limit?: number; after?: string; before?: string } = {}) {
    await this.waitForReady();
    const channel = await this.getChannel(channelId);
    
    if (!channel || !(channel instanceof TextChannel) && !(channel instanceof ThreadChannel)) {
      throw new Error(`Channel ${channelId} is not a text channel`);
    }

    const messages = await channel.messages.fetch({
      limit: options.limit || 100,
      after: options.after,
      before: options.before,
    });

    return messages;
  }

  async fetchAllChannels(guildId: string) {
    await this.waitForReady();
    const guild = await this.getGuild(guildId);
    const channels = await guild.channels.fetch();
    
    return channels.filter(channel => 
      channel && (channel.isTextBased() || channel.isThread())
    );
  }

  async getActiveThreads(channelId: string) {
    await this.waitForReady();
    const channel = await this.getChannel(channelId);
    
    if (!channel || !('threads' in channel)) {
      return [];
    }

    try {
      const threads = await channel.threads.fetchActive();
      return Array.from(threads.threads.values());
    } catch (error) {
      console.warn(`Could not fetch threads for channel ${channelId}:`, error);
      return [];
    }
  }

  async getArchivedThreads(channelId: string, options: { limit?: number } = {}) {
    await this.waitForReady();
    const channel = await this.getChannel(channelId);
    
    if (!channel || !('threads' in channel)) {
      return [];
    }

    const allThreads: any[] = [];

    try {
      // Fetch public archived threads
      const publicArchived = await channel.threads.fetchArchived({ limit: options.limit || 100 });
      allThreads.push(...Array.from(publicArchived.threads.values()));

      // Fetch private archived threads if we have permission
      try {
        const privateArchived = await channel.threads.fetchArchived({ type: 'private', limit: options.limit || 100 });
        allThreads.push(...Array.from(privateArchived.threads.values()));
      } catch (e) {
        // Ignore if we don't have permission for private threads
      }

      return allThreads;
    } catch (error) {
      console.warn(`Could not fetch archived threads for channel ${channelId}:`, error);
      return [];
    }
  }

  getClient() {
    return this.client;
  }

  async destroy() {
    await this.client.destroy();
    this.isReady = false;
  }
}

