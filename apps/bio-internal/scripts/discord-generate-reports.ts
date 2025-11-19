#!/usr/bin/env bun
/**
 * Discord Report Generation Script
 * 
 * This script generates AI-powered weekly/monthly reports from
 * messages already in the database.
 * 
 * Prerequisites:
 *   1. Messages must be synced first (run discord-backfill-messages.ts)
 *   2. OpenAI API key must be configured
 * 
 * Usage:
 *   bun run scripts/discord-generate-reports.ts [report-type]
 *   
 * Examples:
 *   bun run scripts/discord-generate-reports.ts weekly    # Generate weekly reports
 *   bun run scripts/discord-generate-reports.ts monthly   # Generate monthly reports
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

// Get report type from command line or default to weekly
const reportType = (process.argv[2] || 'weekly').toLowerCase();

if (reportType !== 'weekly' && reportType !== 'monthly') {
  console.error('❌ Invalid report type. Must be "weekly" or "monthly"');
  process.exit(1);
}

async function main() {
  console.log('🚀 Starting Discord Report Generation...\n');
  console.log(`📊 Generating ${reportType} reports\n`);
  console.log('='.repeat(80));

  const reportService = new DiscordReportService(OPENAI_API_KEY);

  try {
    // Get all channels from database
    console.log('\n📡 Fetching channels from database...\n');
    const channels = await db.select().from(discordChannels);

    if (channels.length === 0) {
      console.error('❌ No channels found in database!');
      console.error('   Run backfill first: bun run discord:backfill\n');
      process.exit(1);
    }

    console.log(`✅ Found ${channels.length} channels\n`);
    console.log('='.repeat(80));

    // Generate reports for each channel
    console.log(`\n📊 Generating ${reportType} reports...\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      const progress = `[${i + 1}/${channels.length}]`;

      try {
        console.log(`${progress} 📝 Generating report for: ${channel.name}...`);

        let report: string;
        if (reportType === 'weekly') {
          report = await reportService.generateWeeklyReport(channel.channelId);
        } else {
          report = await reportService.generateMonthlyReport(channel.channelId);
        }

        successCount++;
        console.log(`${progress} ✅ Report generated for: ${channel.name}`);
        
        // Print report preview (first 500 chars)
        console.log('\n' + '─'.repeat(80));
        console.log(report.substring(0, 500) + '...');
        console.log('─'.repeat(80) + '\n');

      } catch (error: any) {
        if (error.message?.includes('no messages') || error.message?.includes('not found')) {
          skippedCount++;
          console.log(`${progress} ⏭️  Skipped ${channel.name}: No messages in period\n`);
        } else {
          errorCount++;
          console.error(`${progress} ❌ Error generating report for ${channel.name}:`, error.message);
          console.log('');
        }
      }
    }

    console.log('='.repeat(80));
    console.log('\n📊 REPORT GENERATION SUMMARY\n');
    console.log(`   Total Channels: ${channels.length}`);
    console.log(`   ✅ Reports Generated: ${successCount}`);
    console.log(`   ⏭️  Skipped (No Data): ${skippedCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📝 Report Type: ${reportType}`);
    console.log('');
    console.log('='.repeat(80));

    if (errorCount > 0) {
      console.log('\n⚠️  Some reports failed to generate. Check errors above.\n');
    }

    console.log('\n✅ Report generation completed!\n');
    console.log('💡 View reports in database:');
    console.log('   psql $SUPABASE_DB_URL -c "SELECT * FROM discord_reports ORDER BY created_at DESC LIMIT 5;"');
    console.log('');
    console.log('💡 Or query specific report:');
    console.log('   psql $SUPABASE_DB_URL -c "SELECT content FROM discord_reports WHERE report_type = \'weekly\' ORDER BY created_at DESC LIMIT 1;"');
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal error during report generation:', error);
    process.exit(1);
  }
}

main();

