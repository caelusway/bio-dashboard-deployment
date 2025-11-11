#!/usr/bin/env bun
/**
 * Migration Script: Legacy Growth Data → bio-internal Database
 *
 * Migrates data from old Supabase database to new bio-internal schema:
 * - growth_metrics → growth_metrics
 * - growth_analytics → growth_snapshots
 * - growth_platform_configs → growth_sources
 * - Discord/Telegram historical data
 */

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { growthSources, growthMetrics, growthSnapshots } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// Configuration
const LEGACY_SUPABASE_URL = process.env.LEGACY_SUPABASE_URL!;
const LEGACY_SUPABASE_KEY = process.env.LEGACY_SUPABASE_SERVICE_ROLE_KEY!;
const NEW_DB_URL = process.env.SUPABASE_DB_URL!;
const BATCH_SIZE = 1000;

if (!LEGACY_SUPABASE_URL || !LEGACY_SUPABASE_KEY) {
  console.error('❌ Missing LEGACY_SUPABASE_URL or LEGACY_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!NEW_DB_URL) {
  console.error('❌ Missing SUPABASE_DB_URL');
  process.exit(1);
}

// Initialize connections
const legacyDb = createClient(LEGACY_SUPABASE_URL, LEGACY_SUPABASE_KEY);
const sql = postgres(NEW_DB_URL);
const db = drizzle(sql);

// Platform mapping from old to new
const PLATFORM_MAP: Record<string, string> = {
  'discord': 'discord',
  'telegram': 'telegram',
  'youtube': 'youtube',
  'linkedin': 'linkedin',
  'luma': 'luma',
  'email_newsletter': 'email_newsletter',
  'twitter': 'twitter',
};

// Metric type mapping from old to new
const METRIC_MAP: Record<string, string> = {
  'discord_message_count': 'discord_message_count',
  'discord_member_count': 'discord_member_count',
  'telegram_message_count': 'telegram_message_count',
  'telegram_member_count': 'telegram_member_count',
  'youtube_total_views': 'youtube_total_views',
  'youtube_subscriber_count': 'youtube_subscriber_count',
  'youtube_total_impressions': 'youtube_total_impressions',
  'youtube_top_video_views': 'youtube_top_video_views',
  'youtube_top_video_impressions': 'youtube_top_video_impressions',
  'linkedin_follower_count': 'linkedin_follower_count',
  'luma_page_views': 'luma_page_views',
  'luma_subscriber_count': 'luma_subscriber_count',
  'email_newsletter_signup_count': 'email_newsletter_signup_count',
};

async function migrateGrowthSources() {
  console.log('\n📊 Migrating growth_platform_configs → growth_sources...');

  const { data: legacyConfigs, error } = await legacyDb
    .from('growth_platform_configs')
    .select('*');

  if (error) {
    console.error('❌ Failed to fetch legacy configs:', error);
    return;
  }

  console.log(`Found ${legacyConfigs?.length || 0} platform configs`);

  for (const config of legacyConfigs || []) {
    const platformKey = config.platform as string;
    const mappedPlatform = PLATFORM_MAP[platformKey];

    if (!mappedPlatform) {
      console.warn(`⚠️  Unknown platform: ${platformKey}, skipping...`);
      continue;
    }

    try {
      // Check if source already exists
      const existing = await db
        .select()
        .from(growthSources)
        .where(eq(growthSources.slug, platformKey))
        .limit(1);

      if (existing.length > 0) {
        console.log(`✓ Source already exists: ${platformKey}`);
        continue;
      }

      await db.insert(growthSources).values({
        platform: mappedPlatform as any,
        slug: platformKey,
        displayName: config.platform_metadata?.description || platformKey.toUpperCase(),
        config: config.api_config || {},
        collectionIntervalMinutes: config.collection_interval_minutes || 60,
        lastCollectedAt: config.last_collected_at ? new Date(config.last_collected_at) : null,
        status: config.last_collection_status || 'pending',
        metadata: config.platform_metadata || {},
      });

      console.log(`✓ Migrated source: ${platformKey}`);
    } catch (err) {
      console.error(`❌ Failed to migrate ${platformKey}:`, err);
    }
  }
}

async function migrateGrowthMetrics() {
  console.log('\n📈 Migrating growth_metrics...');

  let offset = 0;
  let totalMigrated = 0;

  while (true) {
    const { data: legacyMetrics, error } = await legacyDb
      .from('growth_metrics')
      .select('*')
      .order('recorded_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('❌ Failed to fetch legacy metrics:', error);
      break;
    }

    if (!legacyMetrics || legacyMetrics.length === 0) {
      break;
    }

    console.log(`Processing batch ${offset}-${offset + legacyMetrics.length}...`);

    for (const metric of legacyMetrics) {
      try {
        // Get source_id from slug
        const platform = metric.platform as string;
        const mappedPlatform = PLATFORM_MAP[platform];

        if (!mappedPlatform) {
          continue;
        }

        const sources = await db
          .select()
          .from(growthSources)
          .where(eq(growthSources.slug, platform))
          .limit(1);

        if (sources.length === 0) {
          console.warn(`⚠️  Source not found for platform: ${platform}`);
          continue;
        }

        const sourceId = sources[0].id;
        const metricType = METRIC_MAP[metric.metric_type as string];

        if (!metricType) {
          console.warn(`⚠️  Unknown metric type: ${metric.metric_type}`);
          continue;
        }

        await db.insert(growthMetrics).values({
          sourceId: sourceId,
          platform: mappedPlatform as any,
          metricType: metricType as any,
          value: metric.metric_value.toString(),
          recordedAt: new Date(metric.recorded_at),
          metadata: metric.metric_metadata || {},
        }).onConflictDoNothing();

        totalMigrated++;
      } catch (err) {
        console.error(`❌ Failed to migrate metric:`, err);
      }
    }

    offset += BATCH_SIZE;
    console.log(`✓ Migrated ${totalMigrated} metrics so far...`);
  }

  console.log(`\n✓ Total metrics migrated: ${totalMigrated}`);
}

async function migrateGrowthAnalytics() {
  console.log('\n📊 Migrating growth_analytics → growth_snapshots...');

  let offset = 0;
  let totalMigrated = 0;

  while (true) {
    const { data: legacyAnalytics, error } = await legacyDb
      .from('growth_analytics')
      .select('*')
      .order('calculated_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('❌ Failed to fetch legacy analytics:', error);
      break;
    }

    if (!legacyAnalytics || legacyAnalytics.length === 0) {
      break;
    }

    console.log(`Processing batch ${offset}-${offset + legacyAnalytics.length}...`);

    for (const analytic of legacyAnalytics) {
      try {
        const platform = analytic.platform as string;
        const mappedPlatform = PLATFORM_MAP[platform];

        if (!mappedPlatform) {
          continue;
        }

        const sources = await db
          .select()
          .from(growthSources)
          .where(eq(growthSources.slug, platform))
          .limit(1);

        if (sources.length === 0) {
          continue;
        }

        const sourceId = sources[0].id;
        const metricType = METRIC_MAP[analytic.metric_type as string];

        if (!metricType) {
          continue;
        }

        // Create daily snapshot
        await db.insert(growthSnapshots).values({
          sourceId: sourceId,
          platform: mappedPlatform as any,
          metricType: metricType as any,
          snapshotWindow: 'day',
          value: analytic.current_value.toString(),
          changeAbs: analytic.change_1d?.toString() || null,
          changePct: analytic.change_1d_percent?.toString() || null,
          snapshotAt: new Date(analytic.calculated_at),
          previousSnapshotAt: analytic.calculated_at ? new Date(new Date(analytic.calculated_at).getTime() - 86400000) : null,
          metadata: analytic.analytics_metadata || {},
        }).onConflictDoNothing();

        totalMigrated++;
      } catch (err) {
        console.error(`❌ Failed to migrate analytic:`, err);
      }
    }

    offset += BATCH_SIZE;
    console.log(`✓ Migrated ${totalMigrated} snapshots so far...`);
  }

  console.log(`\n✓ Total snapshots migrated: ${totalMigrated}`);
}

async function main() {
  console.log('🚀 Starting Legacy Growth Data Migration...\n');
  console.log(`📦 Legacy DB: ${LEGACY_SUPABASE_URL}`);
  console.log(`📦 Target DB: ${NEW_DB_URL}`);

  try {
    await migrateGrowthSources();
    await migrateGrowthMetrics();
    await migrateGrowthAnalytics();

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await sql.end();
  }
}

main();
