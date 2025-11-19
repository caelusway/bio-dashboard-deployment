#!/usr/bin/env bun
/**
 * Import October 2025 Marketing Data
 *
 * Imports ONLY October 2025 data from CSV without clearing existing data
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { growthSources, growthMetrics, growthSnapshots } from '../src/db/schema';
import { and, eq } from 'drizzle-orm';
import { readFileSync } from 'fs';

const NEW_DB_URL = process.env.SUPABASE_DB_URL!;

if (!NEW_DB_URL) {
  console.error('❌ Missing SUPABASE_DB_URL');
  process.exit(1);
}

const sql = postgres(NEW_DB_URL);
const db = drizzle(sql);

// Parse CSV data
function parseCSV(filePath: string): string[][] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  return lines.map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
}

// Convert month name to date
function monthToDate(month: string, year: number = 2025): Date {
  const months: Record<string, number> = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3,
    'May': 4, 'June': 5, 'July': 6, 'August': 7,
    'September': 8, 'October': 9, 'November': 10, 'December': 11
  };
  return new Date(year, months[month] || 0, 1);
}

// Clean number from CSV (handles commas, M, K suffixes)
function cleanNumber(value: string): number {
  if (!value || value === '-') return 0;

  // Remove commas
  value = value.replace(/,/g, '');

  // Handle M (millions)
  if (value.includes('M')) {
    return parseFloat(value.replace('M', '')) * 1000000;
  }

  // Handle K (thousands)
  if (value.includes('K')) {
    return parseFloat(value.replace('K', '')) * 1000;
  }

  // Handle percentages
  if (value.includes('%')) {
    return parseFloat(value.replace('%', ''));
  }

  return parseFloat(value) || 0;
}

async function deleteOctoberData() {
  console.log('🗑️  Deleting existing October 2025 data...\n');

  const octoberDate = new Date(2025, 9, 1); // October is month 9 (0-indexed)

  // Delete October snapshots
  const deletedSnapshots = await db.delete(growthSnapshots)
    .where(eq(growthSnapshots.snapshotAt, octoberDate))
    .returning();
  console.log(`✓ Deleted ${deletedSnapshots.length} October snapshots`);

  // Delete October metrics
  const deletedMetrics = await db.delete(growthMetrics)
    .where(eq(growthMetrics.recordedAt, octoberDate))
    .returning();
  console.log(`✓ Deleted ${deletedMetrics.length} October metrics\n`);
}

async function importOctoberData(csvPath: string) {
  console.log('📊 Importing October 2025 data from CSV...\n');

  const rows = parseCSV(csvPath);

  // Get source IDs mapping
  const sources = await db.select().from(growthSources);
  const sourceMap: Record<string, string> = {};

  for (const source of sources) {
    sourceMap[source.slug] = source.id;
  }

  console.log('Available sources:', Object.keys(sourceMap).join(', '));

  const metrics: any[] = [];
  const snapshots: any[] = [];

  const octoberDate = new Date(2025, 9, 1); // October 2025

  // Parse Website metrics - October is on rows 16-17 (lines 17-18 in file)
  console.log('\n📈 Parsing website metrics for October...');

  // Row 16: October, bio.xyz
  const bioRow = rows[16];
  if (bioRow && bioRow[1] === 'October') {
    const pageViews = cleanNumber(bioRow[3]); // 30359
    const activeUsers = cleanNumber(bioRow[4]); // 14543
    const newUsers = cleanNumber(bioRow[5]); // 13000

    const sourceId = sourceMap['website_bio'];
    if (sourceId) {
      console.log(`  bio.xyz: ${pageViews} views, ${activeUsers} active, ${newUsers} new`);

      if (pageViews > 0) {
        metrics.push({
          sourceId,
          platform: 'website',
          metricType: 'website_page_views',
          value: pageViews.toString(),
          recordedAt: octoberDate,
          metadata: { website: 'bio.xyz', month: 'October' }
        });

        snapshots.push({
          sourceId,
          platform: 'website',
          metricType: 'website_page_views',
          snapshotWindow: 'month',
          value: pageViews.toString(),
          changeAbs: null,
          changePct: null,
          snapshotAt: octoberDate
        });
      }

      if (activeUsers > 0) {
        metrics.push({
          sourceId,
          platform: 'website',
          metricType: 'website_active_users',
          value: activeUsers.toString(),
          recordedAt: octoberDate,
          metadata: { website: 'bio.xyz', month: 'October' }
        });
      }

      if (newUsers > 0) {
        metrics.push({
          sourceId,
          platform: 'website',
          metricType: 'website_new_users',
          value: newUsers.toString(),
          recordedAt: octoberDate,
          metadata: { website: 'bio.xyz', month: 'October' }
        });
      }
    }
  }

  // Row 17: October, app.bio.xyz
  const appRow = rows[17];
  if (appRow && appRow[1] === 'October') {
    const pageViews = cleanNumber(appRow[3]); // 782400
    const activeUsers = cleanNumber(appRow[4]); // 36754
    const newUsers = cleanNumber(appRow[5]); // 23533

    const sourceId = sourceMap['website_app'];
    if (sourceId) {
      console.log(`  app.bio.xyz: ${pageViews} views, ${activeUsers} active, ${newUsers} new`);

      if (pageViews > 0) {
        metrics.push({
          sourceId,
          platform: 'website',
          metricType: 'website_page_views',
          value: pageViews.toString(),
          recordedAt: octoberDate,
          metadata: { website: 'app.bio.xyz', month: 'October' }
        });

        snapshots.push({
          sourceId,
          platform: 'website',
          metricType: 'website_page_views',
          snapshotWindow: 'month',
          value: pageViews.toString(),
          changeAbs: null,
          changePct: null,
          snapshotAt: octoberDate
        });
      }

      if (activeUsers > 0) {
        metrics.push({
          sourceId,
          platform: 'website',
          metricType: 'website_active_users',
          value: activeUsers.toString(),
          recordedAt: octoberDate,
          metadata: { website: 'app.bio.xyz', month: 'October' }
        });
      }

      if (newUsers > 0) {
        metrics.push({
          sourceId,
          platform: 'website',
          metricType: 'website_new_users',
          value: newUsers.toString(),
          recordedAt: octoberDate,
          metadata: { website: 'app.bio.xyz', month: 'October' }
        });
      }
    }
  }

  // Parse Social Follower Count - October is on row 29 (line 30)
  console.log('\n📱 Parsing social metrics for October...');
  const socialRow = rows[29];
  if (socialRow && socialRow[1] === 'October') {
    const xFollowers = cleanNumber(socialRow[3]); // 117300
    const linkedinFollowers = cleanNumber(socialRow[4]); // 1909
    const youtubeFollowers = cleanNumber(socialRow[5]); // 1387
    const blueskyFollowers = cleanNumber(socialRow[6]); // 54
    const telegramMembers = cleanNumber(socialRow[7]); // 16907
    const discordMembers = cleanNumber(socialRow[8]); // 8562

    console.log(`  X: ${xFollowers}, LinkedIn: ${linkedinFollowers}, YouTube: ${youtubeFollowers}`);
    console.log(`  Telegram: ${telegramMembers}, Discord: ${discordMembers}, Bluesky: ${blueskyFollowers}`);

    // Twitter/X metrics
    if (xFollowers > 0 && sourceMap['twitter']) {
      metrics.push({
        sourceId: sourceMap['twitter'],
        platform: 'twitter',
        metricType: 'twitter_follower_count',
        value: xFollowers.toString(),
        recordedAt: octoberDate,
        metadata: { month: 'October' }
      });

      snapshots.push({
        sourceId: sourceMap['twitter'],
        platform: 'twitter',
        metricType: 'twitter_follower_count',
        snapshotWindow: 'month',
        value: xFollowers.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: octoberDate
      });
    }

    // LinkedIn metrics
    if (linkedinFollowers > 0 && sourceMap['linkedin']) {
      metrics.push({
        sourceId: sourceMap['linkedin'],
        platform: 'linkedin',
        metricType: 'linkedin_follower_count',
        value: linkedinFollowers.toString(),
        recordedAt: octoberDate,
        metadata: { month: 'October' }
      });

      snapshots.push({
        sourceId: sourceMap['linkedin'],
        platform: 'linkedin',
        metricType: 'linkedin_follower_count',
        snapshotWindow: 'month',
        value: linkedinFollowers.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: octoberDate
      });
    }

    // YouTube metrics
    if (youtubeFollowers > 0 && sourceMap['youtube']) {
      metrics.push({
        sourceId: sourceMap['youtube'],
        platform: 'youtube',
        metricType: 'youtube_subscriber_count',
        value: youtubeFollowers.toString(),
        recordedAt: octoberDate,
        metadata: { month: 'October' }
      });

      snapshots.push({
        sourceId: sourceMap['youtube'],
        platform: 'youtube',
        metricType: 'youtube_subscriber_count',
        snapshotWindow: 'month',
        value: youtubeFollowers.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: octoberDate
      });
    }

    // Telegram metrics
    if (telegramMembers > 0 && sourceMap['telegram']) {
      metrics.push({
        sourceId: sourceMap['telegram'],
        platform: 'telegram',
        metricType: 'telegram_member_count',
        value: telegramMembers.toString(),
        recordedAt: octoberDate,
        metadata: { month: 'October' }
      });

      snapshots.push({
        sourceId: sourceMap['telegram'],
        platform: 'telegram',
        metricType: 'telegram_member_count',
        snapshotWindow: 'month',
        value: telegramMembers.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: octoberDate
      });
    }

    // Discord metrics
    if (discordMembers > 0 && sourceMap['discord']) {
      metrics.push({
        sourceId: sourceMap['discord'],
        platform: 'discord',
        metricType: 'discord_member_count',
        value: discordMembers.toString(),
        recordedAt: octoberDate,
        metadata: { month: 'October' }
      });

      snapshots.push({
        sourceId: sourceMap['discord'],
        platform: 'discord',
        metricType: 'discord_member_count',
        snapshotWindow: 'month',
        value: discordMembers.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: octoberDate
      });
    }
  }

  // Parse X/Twitter engagement metrics - October is on row 44 (line 45)
  console.log('\n🐦 Parsing X engagement metrics for October...');
  const xMetricsRow = rows[44];
  if (xMetricsRow && xMetricsRow[1] === 'October') {
    const engagements = cleanNumber(xMetricsRow[3]); // 110600
    const engagementRate = cleanNumber(xMetricsRow[4]); // 2.60%
    const impressions = cleanNumber(xMetricsRow[5]); // 4.2M
    const profileVisits = cleanNumber(xMetricsRow[6]); // 13000

    console.log(`  Engagements: ${engagements}, Impressions: ${impressions}, Profile visits: ${profileVisits}`);

    const sourceId = sourceMap['twitter'];
    if (sourceId) {
      if (engagements > 0) {
        metrics.push({
          sourceId,
          platform: 'twitter',
          metricType: 'twitter_engagement_count',
          value: engagements.toString(),
          recordedAt: octoberDate,
          metadata: { month: 'October' }
        });
      }

      if (impressions > 0) {
        metrics.push({
          sourceId,
          platform: 'twitter',
          metricType: 'twitter_impression_count',
          value: impressions.toString(),
          recordedAt: octoberDate,
          metadata: { month: 'October' }
        });

        snapshots.push({
          sourceId,
          platform: 'twitter',
          metricType: 'twitter_impression_count',
          snapshotWindow: 'month',
          value: impressions.toString(),
          changeAbs: null,
          changePct: null,
          snapshotAt: octoberDate
        });
      }
    }
  }

  // Parse Discord metrics - October is on row 58 (line 59)
  console.log('\n💬 Parsing Discord metrics for October...');
  const discordRow = rows[58];
  if (discordRow && discordRow[1] === 'October') {
    const members = cleanNumber(discordRow[3]); // 8562
    console.log(`  Members: ${members}`);
  }

  // Parse YouTube views - October is on row 84 (line 85)
  console.log('\n🎥 Parsing YouTube metrics for October...');
  const youtubeRow = rows[84];
  if (youtubeRow && youtubeRow[1] === 'October') {
    const views = cleanNumber(youtubeRow[3]); // 1800
    const impressions = cleanNumber(youtubeRow[4]); // 25400

    console.log(`  Views: ${views}, Impressions: ${impressions}`);

    const sourceId = sourceMap['youtube'];
    if (sourceId) {
      if (views > 0) {
        metrics.push({
          sourceId,
          platform: 'youtube',
          metricType: 'youtube_view_count',
          value: views.toString(),
          recordedAt: octoberDate,
          metadata: { month: 'October' }
        });

        snapshots.push({
          sourceId,
          platform: 'youtube',
          metricType: 'youtube_view_count',
          snapshotWindow: 'month',
          value: views.toString(),
          changeAbs: null,
          changePct: null,
          snapshotAt: octoberDate
        });
      }

      if (impressions > 0) {
        metrics.push({
          sourceId,
          platform: 'youtube',
          metricType: 'youtube_total_impressions',
          value: impressions.toString(),
          recordedAt: octoberDate,
          metadata: { month: 'October' }
        });
      }
    }
  }

  // Parse Luma metrics - October is on row 103 (line 104)
  console.log('\n📅 Parsing Luma metrics for October...');
  const lumaRow = rows[103];
  if (lumaRow && lumaRow[1] === 'October') {
    const pageViews = cleanNumber(lumaRow[3]); // 53
    const subscribers = cleanNumber(lumaRow[4]); // 16081

    console.log(`  Page views: ${pageViews}, Subscribers: ${subscribers}`);

    const sourceId = sourceMap['luma'];
    if (sourceId) {
      if (pageViews > 0) {
        metrics.push({
          sourceId,
          platform: 'luma',
          metricType: 'luma_page_views',
          value: pageViews.toString(),
          recordedAt: octoberDate,
          metadata: { month: 'October' }
        });

        snapshots.push({
          sourceId,
          platform: 'luma',
          metricType: 'luma_page_views',
          snapshotWindow: 'month',
          value: pageViews.toString(),
          changeAbs: null,
          changePct: null,
          snapshotAt: octoberDate
        });
      }

      if (subscribers > 0) {
        metrics.push({
          sourceId,
          platform: 'luma',
          metricType: 'luma_subscriber_count',
          value: subscribers.toString(),
          recordedAt: octoberDate,
          metadata: { month: 'October' }
        });

        snapshots.push({
          sourceId,
          platform: 'luma',
          metricType: 'luma_subscriber_count',
          snapshotWindow: 'month',
          value: subscribers.toString(),
          changeAbs: null,
          changePct: null,
          snapshotAt: octoberDate
        });
      }
    }
  }

  // Insert metrics
  if (metrics.length > 0) {
    console.log(`\n📥 Inserting ${metrics.length} metrics...`);
    await db.insert(growthMetrics).values(metrics);
    console.log(`✓ Inserted all metrics`);
  }

  // Insert snapshots
  if (snapshots.length > 0) {
    console.log(`\n📸 Inserting ${snapshots.length} snapshots...`);
    await db.insert(growthSnapshots).values(snapshots);
    console.log(`✓ Inserted all snapshots`);
  }

  console.log('\n✅ October 2025 data imported successfully!');
  console.log(`   📊 Total metrics: ${metrics.length}`);
  console.log(`   📸 Total snapshots: ${snapshots.length}`);
}

async function main() {
  console.log('🚀 Starting October 2025 Data Import...\n');

  const csvPath = '/Users/emre/Downloads/Monthly Marketing Reporting - 2025 - Monthly Marketing & Social Report (detailed) (1).csv';

  try {
    await deleteOctoberData();
    await importOctoberData(csvPath);
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
