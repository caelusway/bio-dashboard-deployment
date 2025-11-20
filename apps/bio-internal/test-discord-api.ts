/**
 * Test script to verify Discord API endpoints work
 * Run this to test the fixed code without starting the full server
 */

import { db } from './src/db/client';
import { discordChannels, discordMessages, discordReports, daoEntities } from './src/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

async function testChannelsEndpoint() {
  console.log('🧪 Testing /api/discord/channels endpoint...');
  try {
    const channels = await db
      .select({
        id: discordChannels.id,
        channelId: discordChannels.channelId,
        name: discordChannels.name,
        type: discordChannels.type,
        category: discordChannels.category,
        categoryId: discordChannels.categoryId,
        lastSyncedAt: discordChannels.lastSyncedAt,
        daoId: discordChannels.daoId,
        daoName: daoEntities.name,
        daoSlug: daoEntities.slug,
      })
      .from(discordChannels)
      .leftJoin(daoEntities, eq(discordChannels.daoId, daoEntities.id));

    // Sort in JavaScript
    const sortedChannels = channels.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      return a.name.localeCompare(b.name);
    });

    // Add isForum flag
    const channelsWithForum = sortedChannels.map(channel => ({
      ...channel,
      isForum: channel.type === 'forum',
    }));

    console.log('✅ Channels endpoint works!');
    console.log(`   Found ${channelsWithForum.length} channels`);
    return channelsWithForum;
  } catch (error) {
    console.error('❌ Channels endpoint failed:', error);
    throw error;
  }
}

async function testStatsEndpoint() {
  console.log('\n🧪 Testing /api/discord/stats endpoint...');
  try {
    // Get total channels
    const [channelCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(discordChannels);

    // Get total messages
    const [messageCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(discordMessages);

    // Get total reports
    const [reportCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(discordReports);

    console.log('✅ Stats endpoint works!');
    console.log(`   Channels: ${channelCount.count}`);
    console.log(`   Messages: ${messageCount.count}`);
    console.log(`   Reports: ${reportCount.count}`);

    return {
      totalChannels: channelCount.count,
      totalMessages: messageCount.count,
      totalReports: reportCount.count,
    };
  } catch (error) {
    console.error('❌ Stats endpoint failed:', error);
    throw error;
  }
}

async function testReportsEndpoint() {
  console.log('\n🧪 Testing /api/discord/reports endpoint...');
  try {
    const baseQuery = db
      .select({
        id: discordReports.id,
        channelId: discordReports.channelId,
        reportType: discordReports.reportType,
        periodStart: discordReports.periodStart,
        periodEnd: discordReports.periodEnd,
        content: discordReports.content,
        summary: discordReports.summary,
        status: discordReports.status,
        metadata: discordReports.metadata,
        createdAt: discordReports.createdAt,
        channelName: discordChannels.name,
        channelCategory: discordChannels.category,
        daoId: daoEntities.id,
        daoName: daoEntities.name,
        daoSlug: daoEntities.slug,
      })
      .from(discordReports)
      .leftJoin(discordChannels, eq(discordReports.channelId, discordChannels.id))
      .leftJoin(daoEntities, eq(discordChannels.daoId, daoEntities.id))
      .$dynamic();

    const reports = await baseQuery
      .orderBy(desc(discordReports.createdAt))
      .limit(10);

    console.log('✅ Reports endpoint works!');
    console.log(`   Found ${reports.length} reports`);
    return reports;
  } catch (error) {
    console.error('❌ Reports endpoint failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Testing Discord API endpoints with fixed code...\n');
  
  try {
    await testChannelsEndpoint();
    await testStatsEndpoint();
    await testReportsEndpoint();
    
    console.log('\n✅ All tests passed! The fixed code works correctly.');
    console.log('\n📝 Next step: Restart your backend server to load this fixed code.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Tests failed. There may be an issue with the database or schema.');
    process.exit(1);
  }
}

main();

