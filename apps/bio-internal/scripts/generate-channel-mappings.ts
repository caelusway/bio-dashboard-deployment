#!/usr/bin/env bun
/**
 * Generate Channel Mappings from Discovery JSON
 * 
 * This script reads the discord-channels.json file and generates
 * TypeScript channel mappings code that you can copy into
 * discord-sync-and-report.ts
 * 
 * Usage:
 *   1. Run: bun run discord:discover
 *   2. Run: bun run scripts/generate-channel-mappings.ts
 *   3. Copy the output into discord-sync-and-report.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const JSON_PATH = join(process.cwd(), 'discord-channels.json');

if (!existsSync(JSON_PATH)) {
  console.error('❌ discord-channels.json not found!');
  console.error('   Run: bun run discord:discover first\n');
  process.exit(1);
}

try {
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  
  console.log('📝 GENERATED CHANNEL MAPPINGS\n');
  console.log('Copy this into apps/bio-internal/scripts/discord-sync-and-report.ts:\n');
  console.log('─'.repeat(80));
  console.log('\nconst CHANNEL_MAPPINGS = [');

  // Generate mappings for each category
  for (const category of data.categories) {
    const categoryName = category.categoryName;
    const daoSlug = categoryName.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');

    console.log(`  // ${'='.repeat(70)}`);
    console.log(`  // ${categoryName.toUpperCase()}`);
    console.log(`  // Category: "${categoryName}"`);
    console.log(`  // ${'='.repeat(70)}`);

    for (const channel of category.channels) {
      console.log(`  {`);
      console.log(`    channelId: '${channel.channelId}',`);
      console.log(`    daoSlug: '${daoSlug}', // ⚠️ UPDATE to match your database!`);
      console.log(`    channelName: '${channel.channelName}',`);
      console.log(`    category: '${categoryName}',`);
      console.log(`    isForum: ${channel.isForum},${channel.isForum ? ' // Forum - syncs all threads' : ''}`);
      console.log(`  },`);
    }
    console.log('');
  }

  // Handle uncategorized channels
  if (data.uncategorized && data.uncategorized.length > 0) {
    console.log(`  // ${'='.repeat(70)}`);
    console.log(`  // UNCATEGORIZED CHANNELS`);
    console.log(`  // ${'='.repeat(70)}`);

    for (const channel of data.uncategorized) {
      console.log(`  {`);
      console.log(`    channelId: '${channel.channelId}',`);
      console.log(`    daoSlug: 'UPDATE_ME', // ⚠️ UPDATE to match your database!`);
      console.log(`    channelName: '${channel.channelName}',`);
      console.log(`    category: 'Uncategorized',`);
      console.log(`    isForum: ${channel.isForum},`);
      console.log(`  },`);
    }
    console.log('');
  }

  console.log('];\n');
  console.log('─'.repeat(80));

  // Print instructions
  console.log('\n⚠️  IMPORTANT: Update daoSlug values to match your database!\n');
  console.log('Check your database DAOs:');
  console.log('  psql $SUPABASE_DB_URL -c "SELECT slug, name FROM dao_entities;"\n');
  
  console.log('Common mappings:');
  for (const category of data.categories) {
    const categoryName = category.categoryName;
    const suggestedSlug = categoryName.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
    console.log(`  "${categoryName}" → "${suggestedSlug}"`);
  }

  console.log('\n📊 Summary:');
  const totalChannels = data.categories.reduce((sum: number, cat: any) => sum + cat.channels.length, 0) + 
                        (data.uncategorized?.length || 0);
  const forumCount = data.categories.reduce((sum: number, cat: any) => 
    sum + cat.channels.filter((ch: any) => ch.isForum).length, 0);
  
  console.log(`   Total Channels: ${totalChannels}`);
  console.log(`   Forum Channels: ${forumCount}`);
  console.log(`   Text Channels: ${totalChannels - forumCount}`);
  console.log(`   Categories: ${data.categories.length}\n`);

} catch (error) {
  console.error('❌ Error reading JSON file:', error);
  process.exit(1);
}

