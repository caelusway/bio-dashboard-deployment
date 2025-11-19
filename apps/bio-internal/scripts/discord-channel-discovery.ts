#!/usr/bin/env bun
/**
 * Discord Channel Discovery Script
 * 
 * This script connects to your Discord server and lists all channels
 * organized by category, making it easy to map them to DAOs.
 * 
 * Outputs:
 * - Console: Human-readable structure
 * - JSON file: Machine-readable data for automation
 * 
 * Usage:
 *   bun run scripts/discord-channel-discovery.ts
 */

import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
  console.error('❌ Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID');
  process.exit(1);
}

async function discoverChannels() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  await client.login(DISCORD_BOT_TOKEN);

  client.once('ready', async () => {
    console.log(`✅ Connected as ${client.user?.tag}\n`);
    console.log('📋 Discovering channels...\n');
    console.log('='.repeat(80));

    try {
      const guild = await client.guilds.fetch(DISCORD_GUILD_ID);
      const channels = await guild.channels.fetch();

      // Group channels by category
      const categories = new Map<string, any[]>();
      const uncategorized: any[] = [];
      const discoveryData: any = {
        guildId: DISCORD_GUILD_ID,
        guildName: guild.name,
        discoveredAt: new Date().toISOString(),
        categories: [],
        uncategorized: [],
      };

      for (const [id, channel] of channels) {
        if (!channel) continue;

        // Include text channels, forum channels, and threads
        if (channel.type !== ChannelType.GuildText && 
            channel.type !== ChannelType.GuildCategory &&
            channel.type !== ChannelType.GuildForum &&
            channel.type !== ChannelType.PublicThread &&
            channel.type !== ChannelType.PrivateThread) {
          continue;
        }

        if (channel.type === ChannelType.GuildCategory) {
          if (!categories.has(id)) {
            categories.set(id, []);
          }
        } else {
          const parentId = 'parentId' in channel ? channel.parentId : null;
          if (parentId) {
            if (!categories.has(parentId)) {
              categories.set(parentId, []);
            }
            categories.get(parentId)?.push(channel);
          } else {
            uncategorized.push(channel);
          }
        }
      }

      // Print organized structure
      console.log('\n📁 DISCORD SERVER STRUCTURE\n');

      // Print categorized channels and build JSON data
      for (const [categoryId, categoryChannels] of categories) {
        const category = channels.get(categoryId);
        if (!category || categoryChannels.length === 0) continue;

        console.log(`\n📂 Category: ${category.name.toUpperCase()}`);
        console.log(`   Category ID: ${categoryId}`);
        console.log('   ' + '─'.repeat(70));

        const categoryData: any = {
          categoryId: categoryId,
          categoryName: category.name,
          channels: [],
        };

        for (const channel of categoryChannels) {
          let typeInfo = '';
          let channelType = 'text';
          let isForum = false;
          
          if (channel.type === ChannelType.PublicThread || channel.type === ChannelType.PrivateThread) {
            typeInfo = ' [THREAD]';
            channelType = 'thread';
          } else if (channel.type === ChannelType.GuildForum) {
            typeInfo = ' [FORUM - Topics]';
            channelType = 'forum';
            isForum = true;
          }
          
          const icon = channel.type === ChannelType.GuildForum ? '💬' : '📄';
          console.log(`   ${icon} ${channel.name}${typeInfo}`);
          console.log(`      Channel ID: ${channel.id}`);
          
          if (channel.type === ChannelType.GuildForum) {
            console.log(`      ⚠️  Forum channel - will sync all topic threads`);
          }

          // Add to JSON data
          categoryData.channels.push({
            channelId: channel.id,
            channelName: channel.name,
            type: channelType,
            isForum: isForum,
            position: 'position' in channel ? channel.position : 0,
          });
        }

        discoveryData.categories.push(categoryData);
      }

      // Print uncategorized channels
      if (uncategorized.length > 0) {
        console.log(`\n\n📂 Category: UNCATEGORIZED`);
        console.log('   ' + '─'.repeat(70));
        for (const channel of uncategorized) {
          console.log(`   📄 ${channel.name}`);
          console.log(`      Channel ID: ${channel.id}`);

          // Add to JSON data
          discoveryData.uncategorized.push({
            channelId: channel.id,
            channelName: channel.name,
            type: channel.type === ChannelType.GuildForum ? 'forum' : 'text',
            isForum: channel.type === ChannelType.GuildForum,
          });
        }
      }

      console.log('\n' + '='.repeat(80));
      
      // Save to JSON file
      const outputPath = join(process.cwd(), 'discord-channels.json');
      writeFileSync(outputPath, JSON.stringify(discoveryData, null, 2), 'utf-8');
      console.log(`\n✅ Channel data saved to: ${outputPath}\n`);

      console.log('💡 TIP: Use this information to create your channel mappings!\n');

      // Generate example mapping code
      console.log('📝 EXAMPLE MAPPING CODE:\n');
      console.log('```typescript');
      console.log('const CHANNEL_MAPPINGS = [');

      for (const [categoryId, categoryChannels] of categories) {
        const category = channels.get(categoryId);
        if (!category || categoryChannels.length === 0) continue;

        const categoryName = category.name.toLowerCase().replace(/\s+/g, '-');
        const daoSlug = categoryName.replace(/[^a-z0-9-]/g, '');

        console.log(`  // ${category.name}`);
        for (const channel of categoryChannels.slice(0, 3)) { // Show first 3 as example
          const isForum = channel.type === ChannelType.GuildForum;
          console.log(`  {`);
          console.log(`    channelId: '${channel.id}',`);
          console.log(`    daoSlug: '${daoSlug}', // Update to match your database`);
          console.log(`    channelName: '${channel.name}',`);
          console.log(`    category: '${category.name}',`);
          console.log(`    isForum: ${isForum},${isForum ? ' // Forum channel - syncs all threads' : ''}`);
          console.log(`  },`);
        }
        if (categoryChannels.length > 3) {
          console.log(`  // ... ${categoryChannels.length - 3} more channels in ${category.name}`);
        }
        console.log('');
      }

      console.log('];');
      console.log('```\n');

      // Print summary
      const totalChannels = Array.from(categories.values()).reduce((sum, channels) => sum + channels.length, 0) + uncategorized.length;
      const forumChannels = Array.from(categories.values()).flat().filter(ch => ch.type === ChannelType.GuildForum).length;
      
      console.log('📊 SUMMARY:\n');
      console.log(`   Total Categories: ${categories.size}`);
      console.log(`   Total Channels: ${totalChannels}`);
      console.log(`   Forum Channels: ${forumChannels}`);
      console.log(`   Text Channels: ${totalChannels - forumChannels}`);
      console.log(`   Uncategorized: ${uncategorized.length}\n`);

    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      await client.destroy();
      process.exit(0);
    }
  });
}

discoverChannels();

