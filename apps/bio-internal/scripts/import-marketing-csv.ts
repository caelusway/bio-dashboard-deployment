/**
 * Import Marketing CSV Data
 *
 * Clears existing growth data and imports clean data from marketing CSV
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { growthSources, growthMetrics, growthSnapshots } from '../src/db/schema';
import { eq } from 'drizzle-orm';
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

async function clearExistingData() {
  console.log('🗑️  Clearing existing growth data...\n');

  // Delete in correct order due to foreign keys
  await db.delete(growthSnapshots);
  console.log('✓ Cleared growth_snapshots');

  await db.delete(growthMetrics);
  console.log('✓ Cleared growth_metrics');

  console.log('✓ Data cleared successfully\n');
}

async function importCSVData(csvPath: string) {
  console.log('📊 Importing marketing CSV data...\n');

  const rows = parseCSV(csvPath);

  // Get source IDs mapping
  const sources = await db.select().from(growthSources);
  const sourceMap: Record<string, string> = {};

  for (const source of sources) {
    sourceMap[source.slug] = source.id;
  }

  const metrics: any[] = [];
  const snapshots: any[] = [];

  // Parse Website metrics (rows 4-32)
  console.log('📈 Parsing website metrics...');
  for (let i = 4; i <= 32; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;

    const month = row[1];
    const website = row[2];
    const pageViews = cleanNumber(row[3]);
    const activeUsers = cleanNumber(row[4]);
    const newUsers = cleanNumber(row[5]);

    if (!month || !website) continue;

    const date = monthToDate(month);
    const slug = website === 'bio.xyz' ? 'website_bio' : 'website_app';

    // Skip if we don't have this source
    const sourceId = sourceMap[slug];
    if (!sourceId) {
      console.log(`⚠️  Skipping ${slug} - source not found`);
      continue;
    }

    // Create metrics
    if (pageViews > 0) {
      metrics.push({
        sourceId,
        platform: 'website',
        metricType: 'website_page_views',
        value: pageViews.toString(),
        recordedAt: date,
        metadata: { website, month }
      });

      snapshots.push({
        sourceId,
        platform: 'website',
        metricType: 'website_page_views',
        snapshotWindow: 'month',
        value: pageViews.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: date
      });
    }

    if (activeUsers > 0) {
      metrics.push({
        sourceId,
        platform: 'website',
        metricType: 'website_active_users',
        value: activeUsers.toString(),
        recordedAt: date,
        metadata: { website, month }
      });
    }

    if (newUsers > 0) {
      metrics.push({
        sourceId,
        platform: 'website',
        metricType: 'website_new_users',
        value: newUsers.toString(),
        recordedAt: date,
        metadata: { website, month }
      });
    }
  }

  // Parse Social Follower Count (rows 38-55)
  console.log('📱 Parsing social metrics...');
  for (let i = 38; i <= 55; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;

    const month = row[1];
    const xFollowers = cleanNumber(row[3]);
    const linkedinFollowers = cleanNumber(row[4]);
    const youtubeFollowers = cleanNumber(row[5]);
    const blueskyFollowers = cleanNumber(row[6]);
    const telegramMembers = cleanNumber(row[7]);
    const discordMembers = cleanNumber(row[8]);

    if (!month) continue;

    const date = monthToDate(month);

    // Twitter/X metrics
    if (xFollowers > 0 && sourceMap['twitter']) {
      metrics.push({
        sourceId: sourceMap['twitter'],
        platform: 'twitter',
        metricType: 'twitter_follower_count',
        value: xFollowers.toString(),
        recordedAt: date,
        metadata: { month }
      });

      snapshots.push({
        sourceId: sourceMap['twitter'],
        platform: 'twitter',
        metricType: 'twitter_follower_count',
        snapshotWindow: 'month',
        value: xFollowers.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: date
      });
    }

    // LinkedIn metrics
    if (linkedinFollowers > 0 && sourceMap['linkedin']) {
      metrics.push({
        sourceId: sourceMap['linkedin'],
        platform: 'linkedin',
        metricType: 'linkedin_follower_count',
        value: linkedinFollowers.toString(),
        recordedAt: date,
        metadata: { month }
      });

      snapshots.push({
        sourceId: sourceMap['linkedin'],
        platform: 'linkedin',
        metricType: 'linkedin_follower_count',
        snapshotWindow: 'month',
        value: linkedinFollowers.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: date
      });
    }

    // YouTube metrics
    if (youtubeFollowers > 0 && sourceMap['youtube']) {
      metrics.push({
        sourceId: sourceMap['youtube'],
        platform: 'youtube',
        metricType: 'youtube_subscriber_count',
        value: youtubeFollowers.toString(),
        recordedAt: date,
        metadata: { month }
      });

      snapshots.push({
        sourceId: sourceMap['youtube'],
        platform: 'youtube',
        metricType: 'youtube_subscriber_count',
        snapshotWindow: 'month',
        value: youtubeFollowers.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: date
      });
    }

    // Telegram metrics
    if (telegramMembers > 0 && sourceMap['telegram']) {
      metrics.push({
        sourceId: sourceMap['telegram'],
        platform: 'telegram',
        metricType: 'telegram_member_count',
        value: telegramMembers.toString(),
        recordedAt: date,
        metadata: { month }
      });

      snapshots.push({
        sourceId: sourceMap['telegram'],
        platform: 'telegram',
        metricType: 'telegram_member_count',
        snapshotWindow: 'month',
        value: telegramMembers.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: date
      });
    }

    // Discord metrics
    if (discordMembers > 0 && sourceMap['discord']) {
      metrics.push({
        sourceId: sourceMap['discord'],
        platform: 'discord',
        metricType: 'discord_member_count',
        value: discordMembers.toString(),
        recordedAt: date,
        metadata: { month }
      });

      snapshots.push({
        sourceId: sourceMap['discord'],
        platform: 'discord',
        metricType: 'discord_member_count',
        snapshotWindow: 'month',
        value: discordMembers.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: date
      });
    }
  }

  // Parse X/Twitter engagement metrics (rows 65-78)
  console.log('🐦 Parsing X engagement metrics...');
  for (let i = 65; i <= 78; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;

    const month = row[1];
    const engagements = cleanNumber(row[3]);
    const engagementRate = cleanNumber(row[4]);
    const impressions = cleanNumber(row[5]);
    const profileVisits = cleanNumber(row[6]);

    if (!month || !sourceMap['twitter']) continue;

    const date = monthToDate(month);
    const sourceId = sourceMap['twitter'];

    if (engagements > 0) {
      metrics.push({
        sourceId,
        platform: 'twitter',
        metricType: 'twitter_engagement_count',
        value: engagements.toString(),
        recordedAt: date,
        metadata: { month }
      });
    }

    if (impressions > 0) {
      metrics.push({
        sourceId,
        platform: 'twitter',
        metricType: 'twitter_impression_count',
        value: impressions.toString(),
        recordedAt: date,
        metadata: { month }
      });

      snapshots.push({
        sourceId,
        platform: 'twitter',
        metricType: 'twitter_impression_count',
        snapshotWindow: 'month',
        value: impressions.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: date
      });
    }
  }

  // Parse YouTube views (rows 112-118)
  console.log('🎥 Parsing YouTube metrics...');
  for (let i = 112; i <= 118; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;

    const month = row[1];
    const views = cleanNumber(row[3]);
    const impressions = cleanNumber(row[4]);

    if (!month || !sourceMap['youtube']) continue;

    const date = monthToDate(month);
    const sourceId = sourceMap['youtube'];

    if (views > 0) {
      metrics.push({
        sourceId,
        platform: 'youtube',
        metricType: 'youtube_view_count',
        value: views.toString(),
        recordedAt: date,
        metadata: { month }
      });

      snapshots.push({
        sourceId,
        platform: 'youtube',
        metricType: 'youtube_view_count',
        snapshotWindow: 'month',
        value: views.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: date
      });
    }
  }

  // Parse Luma metrics (rows 132-137)
  console.log('📅 Parsing Luma metrics...');
  for (let i = 132; i <= 137; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;

    const month = row[1];
    const pageViews = cleanNumber(row[3]);
    const subscribers = cleanNumber(row[4]);

    if (!month || !sourceMap['luma']) continue;

    const date = monthToDate(month);
    const sourceId = sourceMap['luma'];

    if (pageViews > 0) {
      metrics.push({
        sourceId,
        platform: 'luma',
        metricType: 'luma_page_views',
        value: pageViews.toString(),
        recordedAt: date,
        metadata: { month }
      });

      snapshots.push({
        sourceId,
        platform: 'luma',
        metricType: 'luma_page_views',
        snapshotWindow: 'month',
        value: pageViews.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: date
      });
    }

    if (subscribers > 0) {
      metrics.push({
        sourceId,
        platform: 'luma',
        metricType: 'luma_subscriber_count',
        value: subscribers.toString(),
        recordedAt: date,
        metadata: { month }
      });

      snapshots.push({
        sourceId,
        platform: 'luma',
        metricType: 'luma_subscriber_count',
        snapshotWindow: 'month',
        value: subscribers.toString(),
        changeAbs: null,
        changePct: null,
        snapshotAt: date
      });
    }
  }

  // Insert metrics
  if (metrics.length > 0) {
    console.log(`\n📥 Inserting ${metrics.length} metrics...`);
    const BATCH_SIZE = 100;
    for (let i = 0; i < metrics.length; i += BATCH_SIZE) {
      const batch = metrics.slice(i, i + BATCH_SIZE);
      await db.insert(growthMetrics).values(batch);
      console.log(`✓ Inserted batch ${i / BATCH_SIZE + 1} (${Math.min(i + BATCH_SIZE, metrics.length)}/${metrics.length})`);
    }
  }

  // Insert snapshots
  if (snapshots.length > 0) {
    console.log(`\n📸 Inserting ${snapshots.length} snapshots...`);
    const BATCH_SIZE = 100;
    for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
      const batch = snapshots.slice(i, i + BATCH_SIZE);
      await db.insert(growthSnapshots).values(batch);
      console.log(`✓ Inserted batch ${i / BATCH_SIZE + 1} (${Math.min(i + BATCH_SIZE, snapshots.length)}/${snapshots.length})`);
    }
  }

  console.log('\n✅ CSV data imported successfully!');
  console.log(`   📊 Total metrics: ${metrics.length}`);
  console.log(`   📸 Total snapshots: ${snapshots.length}`);
}

async function main() {
  console.log('🚀 Starting Marketing CSV Import...\n');

  const csvPath = '/Users/emre/Downloads/Monthly Marketing Reporting - 2025 - Monthly Marketing & Social Report (detailed).csv';

  try {
    await clearExistingData();
    await importCSVData(csvPath);
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
