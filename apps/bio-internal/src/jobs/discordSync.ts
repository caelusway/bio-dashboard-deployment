/**
 * Discord Sync Cron Job
 * 
 * Automatically syncs Discord messages on a schedule.
 * Runs daily to backfill the last 2 days of messages (ensures no gaps).
 */

import { CronJob } from 'cron';
import { DiscordClient } from '../services/discord/discordClient';
import { DiscordSyncService } from '../services/discord/discordSyncService';
import { env } from '../config/env';
import { db } from '../db/client';
import { discordChannels } from '../db/schema';

// Channel mappings - these should match your production channels
// You can also load these from the database if you prefer
const CHANNEL_MAPPINGS = [
  // This will be populated from your discord-backfill-messages.ts
  // Or we can fetch from database dynamically
];

/**
 * Daily Discord Message Sync
 * Runs every day at 2:00 AM UTC
 * Backfills last 2 days to ensure no messages are missed
 */
export const dailyDiscordSync = new CronJob(
  '0 2 * * *', // Every day at 2:00 AM UTC
  async () => {
    console.log('🔄 [CRON] Starting daily Discord message sync...');
    
    try {
      const syncService = new DiscordSyncService(
        env.DISCORD_BOT_TOKEN,
        env.DISCORD_GUILD_ID
      );

      // Fetch all channels from database
      const channels = await db.select().from(discordChannels);
      
      if (channels.length === 0) {
        console.warn('⚠️ [CRON] No Discord channels found in database. Skipping sync.');
        return;
      }

      let totalSynced = 0;
      let totalSkipped = 0;
      let successCount = 0;
      let errorCount = 0;

      for (const channel of channels) {
        try {
          console.log(`📥 [CRON] Syncing channel: ${channel.name} (${channel.channelId})`);
          
          const result = await syncService.syncChannelMessages(channel.channelId, {
            daysBack: 2, // Last 2 days to ensure no gaps
            limit: 5000,
            isForum: channel.isForum || false,
          });

          totalSynced += result.syncedCount;
          totalSkipped += result.skippedCount;
          successCount++;
          
          console.log(`✅ [CRON] ${channel.name}: ${result.syncedCount} messages synced`);
        } catch (error) {
          errorCount++;
          console.error(`❌ [CRON] Error syncing channel ${channel.name}:`, error);
        }
      }

      console.log(`✅ [CRON] Daily sync complete: ${totalSynced} messages synced, ${errorCount} errors`);
      
      await syncService.destroy();
    } catch (error) {
      console.error('❌ [CRON] Daily Discord sync failed:', error);
    }
  },
  null, // onComplete
  false, // start now? (false = manual start)
  'UTC' // timezone
);

/**
 * Weekly Report Generation
 * Runs every Monday at 9:00 AM UTC
 */
export const weeklyDiscordReports = new CronJob(
  '0 9 * * 1', // Every Monday at 9:00 AM UTC
  async () => {
    console.log('📊 [CRON] Starting weekly Discord report generation...');
    
    try {
      const { DiscordReportService } = await import('../services/discord/discordReportService');
      const reportService = new DiscordReportService(env.OPENAI_API_KEY);

      // Fetch all channels from database
      const channels = await db.select().from(discordChannels);
      
      if (channels.length === 0) {
        console.warn('⚠️ [CRON] No Discord channels found in database. Skipping reports.');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const channel of channels) {
        try {
          console.log(`📝 [CRON] Generating weekly report for: ${channel.name}`);
          
          const reportContent = await reportService.generateWeeklyReport(channel.channelId);
          
          // Log report (you can also send to Slack, email, etc.)
          console.log(`✅ [CRON] Weekly report generated for ${channel.name}`);
          console.log(reportContent);
          console.log('\n' + '='.repeat(80) + '\n');
          
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`❌ [CRON] Error generating report for ${channel.name}:`, error);
        }
      }

      console.log(`✅ [CRON] Weekly reports complete: ${successCount} generated, ${errorCount} errors`);
    } catch (error) {
      console.error('❌ [CRON] Weekly report generation failed:', error);
    }
  },
  null,
  false,
  'UTC'
);

/**
 * Monthly Report Generation
 * Runs on the 1st of every month at 10:00 AM UTC
 */
export const monthlyDiscordReports = new CronJob(
  '0 10 1 * *', // 1st of every month at 10:00 AM UTC
  async () => {
    console.log('📊 [CRON] Starting monthly Discord report generation...');
    
    try {
      const { DiscordReportService } = await import('../services/discord/discordReportService');
      const reportService = new DiscordReportService(env.OPENAI_API_KEY);

      // Fetch all channels from database
      const channels = await db.select().from(discordChannels);
      
      if (channels.length === 0) {
        console.warn('⚠️ [CRON] No Discord channels found in database. Skipping reports.');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const channel of channels) {
        try {
          console.log(`📝 [CRON] Generating monthly report for: ${channel.name}`);
          
          const reportContent = await reportService.generateMonthlyReport(channel.channelId);
          
          // Log report (you can also send to Slack, email, etc.)
          console.log(`✅ [CRON] Monthly report generated for ${channel.name}`);
          console.log(reportContent);
          console.log('\n' + '='.repeat(80) + '\n');
          
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`❌ [CRON] Error generating report for ${channel.name}:`, error);
        }
      }

      console.log(`✅ [CRON] Monthly reports complete: ${successCount} generated, ${errorCount} errors`);
    } catch (error) {
      console.error('❌ [CRON] Monthly report generation failed:', error);
    }
  },
  null,
  false,
  'UTC'
);

/**
 * Start all Discord cron jobs
 */
export function startDiscordCronJobs() {
  console.log('🚀 Starting Discord cron jobs...');
  
  dailyDiscordSync.start();
  console.log('✅ Daily Discord sync scheduled (2:00 AM UTC)');
  
  weeklyDiscordReports.start();
  console.log('✅ Weekly reports scheduled (Mondays 9:00 AM UTC)');
  
  monthlyDiscordReports.start();
  console.log('✅ Monthly reports scheduled (1st of month 10:00 AM UTC)');
}

/**
 * Stop all Discord cron jobs
 */
export function stopDiscordCronJobs() {
  console.log('🛑 Stopping Discord cron jobs...');
  
  dailyDiscordSync.stop();
  weeklyDiscordReports.stop();
  monthlyDiscordReports.stop();
  
  console.log('✅ All Discord cron jobs stopped');
}

