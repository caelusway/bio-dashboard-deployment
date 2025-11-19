#!/usr/bin/env bun
/**
 * Discord Monthly Reports - Cron Script
 * 
 * This script generates monthly reports for all Discord channels.
 * It should be scheduled to run on the 1st of every month via system cron.
 * 
 * Schedule with crontab:
 *   0 10 1 * * cd /path/to/bio-internal && bun run scripts/discord-monthly-reports-cron.ts
 * 
 * Or use GitHub Actions, Coolify cron, or any other scheduler.
 */

import { DiscordReportService } from '../src/services/discord/discordReportService';
import { db } from '../src/db/client';
import { discordChannels } from '../src/db/schema';

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

async function main() {
  console.log('📊 Starting Monthly Discord Report Generation');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  try {
    const reportService = new DiscordReportService(OPENAI_API_KEY);

    // Fetch all channels from database
    const channels = await db.select().from(discordChannels);
    
    if (channels.length === 0) {
      console.warn('⚠️ No Discord channels found in database. Exiting.');
      process.exit(0);
    }

    console.log(`📡 Found ${channels.length} channels to generate reports for\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      const progress = `[${i + 1}/${channels.length}]`;
      
      try {
        console.log(`${progress} 📝 Generating monthly report for: ${channel.name} (${channel.channelId})`);
        
        const reportContent = await reportService.generateMonthlyReport(channel.channelId);
        
        // Log the report
        console.log('\n' + '─'.repeat(80));
        console.log(reportContent);
        console.log('─'.repeat(80) + '\n');
        
        successCount++;
        console.log(`${progress} ✅ Report generated for ${channel.name}\n`);
      } catch (error) {
        errorCount++;
        console.error(`${progress} ❌ Error generating report for ${channel.name}:`, error);
        console.log(''); // Empty line for readability
      }
    }

    console.log('='.repeat(80));
    console.log('\n📊 MONTHLY REPORT SUMMARY\n');
    console.log(`   Total Channels: ${channels.length}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📅 Generated: ${new Date().toISOString()}`);
    console.log('');
    console.log('='.repeat(80));

    if (errorCount > 0) {
      console.log('\n⚠️  Some reports failed to generate. Check errors above.\n');
      process.exit(1);
    }

    console.log('\n✅ Monthly report generation completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during monthly report generation:', error);
    process.exit(1);
  }
}

main();

