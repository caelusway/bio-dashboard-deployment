import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import {
  growthSources,
  growthMetrics,
  growthSnapshots,
  growthPlatformEnum,
  growthMetricEnum,
  snapshotWindowEnum,
} from '../src/db/schema';

const REQUIRED_ENV = ['SUPABASE_DB_URL', 'LEGACY_SUPABASE_URL', 'LEGACY_SUPABASE_SERVICE_ROLE_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var ${key}`);
  }
}

const legacySupabase = createClient(
  process.env['LEGACY_SUPABASE_URL']!,
  process.env['LEGACY_SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const targetClient = postgres(process.env['SUPABASE_DB_URL']!, {
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(targetClient);

const allowedPlatforms = new Set(growthPlatformEnum.enumValues);
const allowedMetrics = new Set(growthMetricEnum.enumValues);

interface LegacyPlatformConfig {
  platform: string;
  collection_enabled?: boolean;
  collection_interval_minutes?: number | null;
  api_config?: Record<string, any> | null;
  last_collected_at?: string | null;
  last_collection_status?: string | null;
  last_collection_error?: string | null;
  platform_metadata?: Record<string, any> | null;
}

interface LegacyMetric {
  platform: string;
  metric_type: string;
  metric_value: number;
  metric_metadata: Record<string, any> | null;
  recorded_at: string;
}

async function main(): Promise<void> {
  try {
  const sourceMap = new Map<string, string>();

  // Step 1: Seed sources from platform configs
  const { data: configs, error: configError } = await legacySupabase
    .from<LegacyPlatformConfig>('growth_platform_configs')
    .select('*');

  if (configError) {
    throw new Error(`Failed to fetch growth_platform_configs: ${configError.message}`);
  }

  if (configs) {
    for (const config of configs) {
      const platform = normalizePlatform(config.platform);
      const sourceId = await ensureSource(platform, config);
      sourceMap.set(platform, sourceId);
    }
  }

  // Step 2: Backfill growth metrics
  let insertedMetrics = 0;
  const metricsBySourceAndType = new Map<string, Array<{ value: number; recordedAt: Date; metadata: Record<string, any> }>>();

  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data: metrics, error: metricsError } = await legacySupabase
      .from<LegacyMetric>('growth_metrics')
      .select('*')
      .order('recorded_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (metricsError) {
      throw new Error(`Failed to fetch growth_metrics: ${metricsError.message}`);
    }

    if (!metrics || metrics.length === 0) {
      break;
    }

    const values = [] as Array<typeof growthMetrics.$inferInsert>;

    for (const metric of metrics) {
      const platform = normalizePlatform(metric.platform);
      const metricTypeInfo = normalizeMetricType(metric.metric_type, metric.metric_metadata);

      let sourceId = sourceMap.get(platform);
      if (!sourceId) {
        sourceId = await ensureSource(platform);
        sourceMap.set(platform, sourceId);
      }

      const recordedAt = new Date(metric.recorded_at);
      const metadata = metricTypeInfo.metadata ?? {};
      if (metric.metric_metadata) {
        Object.assign(metadata, metric.metric_metadata);
      }

      values.push({
        sourceId,
        platform: platform as (typeof growthPlatformEnum.enumValues)[number],
        metricType: metricTypeInfo.metricType as (typeof growthMetricEnum.enumValues)[number],
        value: metric.metric_value,
        recordedAt,
        metadata,
      });

      const key = `${sourceId}|${metricTypeInfo.metricType}`;
      if (!metricsBySourceAndType.has(key)) {
        metricsBySourceAndType.set(key, []);
      }
      metricsBySourceAndType.get(key)!.push({
        value: metric.metric_value,
        recordedAt,
        metadata,
      });
    }

    for (let i = 0; i < values.length; i += 500) {
      const batch = values.slice(i, i + 500);
      await db.insert(growthMetrics)
        .values(batch)
        .onConflictDoNothing();
      insertedMetrics += batch.length;
    }
  }

  console.log(`Inserted ${insertedMetrics} growth metrics.`);

  // Step 3: Build daily snapshots
  const snapshotRows: Array<typeof growthSnapshots.$inferInsert> = [];

  for (const [key, entries] of metricsBySourceAndType.entries()) {
    const [sourceId, metricType] = key.split('|');
    const grouped = new Map<string, { value: number; recordedAt: Date }>();

    for (const entry of entries) {
      const dayKey = entry.recordedAt.toISOString().slice(0, 10);
      const existing = grouped.get(dayKey);
      if (!existing || existing.recordedAt < entry.recordedAt) {
        grouped.set(dayKey, { value: entry.value, recordedAt: entry.recordedAt });
      }
    }

    const days = Array.from(grouped.keys()).sort();
    let previousValue: number | undefined;
    let previousDate: Date | undefined;

    for (const dayKey of days) {
      const info = grouped.get(dayKey)!;
      const snapshotAt = new Date(`${dayKey}T00:00:00Z`);
      const changeAbs = previousValue !== undefined ? info.value - previousValue : null;
      const changePct = previousValue && previousValue !== 0
        ? (info.value - previousValue) / previousValue
        : null;

      snapshotRows.push({
        sourceId,
        platform: getPlatformForSource(sourceId, sourceMap),
        metricType: metricType as (typeof growthMetricEnum.enumValues)[number],
        snapshotWindow: snapshotWindowEnum.enumValues.includes('day') ? 'day' : snapshotWindowEnum.enumValues[0],
        value: info.value,
        changeAbs: changeAbs ?? undefined,
        changePct: changePct ?? undefined,
        snapshotAt,
        previousSnapshotAt: previousDate,
        metadata: { source: 'legacy_backfill' },
      });

      previousValue = info.value;
      previousDate = snapshotAt;
    }
  }

  let insertedSnapshots = 0;
  for (let i = 0; i < snapshotRows.length; i += 500) {
    const batch = snapshotRows.slice(i, i + 500);
    await db.insert(growthSnapshots)
      .values(batch)
      .onConflictDoNothing();
    insertedSnapshots += batch.length;
  }

  console.log(`Inserted ${insertedSnapshots} growth snapshots.`);
  } finally {
    await targetClient.end();
  }
}

function normalizePlatform(platform: string): string {
  const normalized = platform?.toLowerCase?.() ?? 'other';
  if (allowedPlatforms.has(normalized)) {
    return normalized;
  }
  return 'other';
}

function normalizeMetricType(metricType: string, metadata: Record<string, any> | null) {
  const normalized = metricType?.toLowerCase?.() ?? 'custom';
  if (allowedMetrics.has(normalized)) {
    return { metricType: normalized, metadata };
  }
  const mergedMetadata = { ...(metadata ?? {}), original_metric_type: metricType };
  return { metricType: 'custom', metadata: mergedMetadata };
}

async function ensureSource(platform: string, config?: LegacyPlatformConfig): Promise<string> {
  const slug = platform;
  const displayName = toTitleCase(platform.replace('_', ' '));
  const apiConfig = config?.api_config ?? {};
  const metadata: Record<string, any> = {};
  if (config?.platform_metadata) {
    metadata.platform_metadata = config.platform_metadata;
  }
  if (config?.last_collection_error) {
    metadata.last_collection_error = config.last_collection_error;
  }

  const inserted = await db.insert(growthSources)
    .values({
      platform: platform as (typeof growthPlatformEnum.enumValues)[number],
      slug,
      displayName,
      config: apiConfig,
      collectionIntervalMinutes: config?.collection_interval_minutes ?? 60,
      lastCollectedAt: config?.last_collected_at ? new Date(config.last_collected_at) : null,
      status: config?.last_collection_status ?? (config?.collection_enabled === false ? 'disabled' : 'pending'),
      metadata,
    })
    .onConflictDoUpdate({
      target: growthSources.slug,
      set: {
        platform: platform as (typeof growthPlatformEnum.enumValues)[number],
        displayName,
        config: apiConfig,
        collectionIntervalMinutes: config?.collection_interval_minutes ?? 60,
        lastCollectedAt: config?.last_collected_at ? new Date(config.last_collected_at) : null,
        status: config?.last_collection_status ?? (config?.collection_enabled === false ? 'disabled' : 'pending'),
        metadata,
        updatedAt: new Date(),
      },
    })
    .returning({ id: growthSources.id });

  if (inserted.length > 0) {
    return inserted[0]!.id;
  }

  const existing = await db
    .select({ id: growthSources.id })
    .from(growthSources)
    .where(eq(growthSources.slug, slug))
    .limit(1);

  if (!existing[0]) {
    throw new Error(`Failed to ensure growth source for platform ${platform}`);
  }

  return existing[0].id;
}

function toTitleCase(input: string): string {
  return input.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function getPlatformForSource(sourceId: string, sourceMap: Map<string, string>): (typeof growthPlatformEnum.enumValues)[number] {
  for (const [platform, id] of sourceMap.entries()) {
    if (id === sourceId && allowedPlatforms.has(platform)) {
      return platform as (typeof growthPlatformEnum.enumValues)[number];
    }
  }
  return 'other';
}

main().catch((error) => {
  console.error('Growth backfill failed:', error);
  process.exit(1);
});
