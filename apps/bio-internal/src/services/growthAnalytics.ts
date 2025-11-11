import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  growthSources,
  growthSnapshots,
  growthPlatformEnum,
  growthMetricEnum,
  snapshotWindowEnum,
} from '../db/schema';

export type GrowthSnapshotWindow = (typeof snapshotWindowEnum.enumValues)[number];
export type GrowthPlatform = (typeof growthPlatformEnum.enumValues)[number];
export type GrowthMetricType = (typeof growthMetricEnum.enumValues)[number];

export interface GrowthMetricSummary {
  metricType: GrowthMetricType;
  value: number;
  changeAbs?: number | null;
  changePct?: number | null;
  snapshotAt: string;
}

export interface GrowthSourceSummary {
  slug: string;
  displayName: string;
  platform: GrowthPlatform;
  status: string | null;
  lastCollectedAt?: string | null;
  metrics: GrowthMetricSummary[];
}

export interface GrowthHistoryPoint {
  snapshotAt: string;
  value: number;
  changeAbs?: number | null;
  changePct?: number | null;
}

const DEFAULT_WINDOW: GrowthSnapshotWindow = 'day';
const DEFAULT_RANGE_DAYS = 90;

export async function getGrowthSourceSummaries(window: GrowthSnapshotWindow = DEFAULT_WINDOW): Promise<GrowthSourceSummary[]> {
  const sources = await db
    .select({
      id: growthSources.id,
      slug: growthSources.slug,
      displayName: growthSources.displayName,
      platform: growthSources.platform,
      status: growthSources.status,
      lastCollectedAt: growthSources.lastCollectedAt,
    })
    .from(growthSources)
    .orderBy(growthSources.slug);

  if (!sources.length) {
    return [];
  }

  const sourceIds = sources.map((source) => source.id);

  let snapshots;
  try {
    snapshots = await db
      .select({
        sourceId: growthSnapshots.sourceId,
        metricType: growthSnapshots.metricType,
        value: growthSnapshots.value,
        changeAbs: growthSnapshots.changeAbs,
        changePct: growthSnapshots.changePct,
        snapshotAt: growthSnapshots.snapshotAt,
        rank: sql`ROW_NUMBER() OVER (PARTITION BY ${growthSnapshots.sourceId}, ${growthSnapshots.metricType}
               ORDER BY ${growthSnapshots.snapshotAt} DESC)`.as('rank'),
      })
      .from(growthSnapshots)
      .where(
        and(
          inArray(growthSnapshots.sourceId, sourceIds),
          eq(growthSnapshots.snapshotWindow, window),
        ),
      );
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    snapshots = [];
  }

  const latestBySourceMetric = snapshots.filter((row) => Number(row.rank) === 1);

  const grouped = new Map<string, GrowthMetricSummary[]>();
  for (const row of latestBySourceMetric) {
    const metrics = grouped.get(row.sourceId) || [];
    metrics.push({
      metricType: row.metricType,
      value: Number(row.value),
      changeAbs: row.changeAbs !== null ? Number(row.changeAbs) : null,
      changePct: row.changePct !== null ? Number(row.changePct) : null,
      snapshotAt: row.snapshotAt?.toISOString?.() ?? new Date(row.snapshotAt ?? new Date()).toISOString(),
    });
    grouped.set(row.sourceId, metrics);
  }

  return sources.map((source) => ({
    slug: source.slug,
    displayName: source.displayName,
    platform: source.platform,
    status: source.status ?? null,
    lastCollectedAt: source.lastCollectedAt?.toISOString?.() ?? null,
    metrics: grouped.get(source.id) ?? [],
  }));
}

export async function getGrowthHistory(
  slug: string,
  metricType: GrowthMetricType,
  window: GrowthSnapshotWindow = DEFAULT_WINDOW,
  rangeDays: number = DEFAULT_RANGE_DAYS,
): Promise<GrowthHistoryPoint[]> {
  const source = await db
    .select({ id: growthSources.id })
    .from(growthSources)
    .where(eq(growthSources.slug, slug))
    .limit(1);

  const sourceId = source[0]?.id;
  if (!sourceId) {
    return [];
  }

  const rows = await db
    .select({
      snapshotAt: growthSnapshots.snapshotAt,
      value: growthSnapshots.value,
      changeAbs: growthSnapshots.changeAbs,
      changePct: growthSnapshots.changePct,
    })
    .from(growthSnapshots)
    .where(
      and(
        eq(growthSnapshots.sourceId, sourceId),
        eq(growthSnapshots.metricType, metricType),
        eq(growthSnapshots.snapshotWindow, window),
        sql`${growthSnapshots.snapshotAt} >= NOW() - INTERVAL '${sql.raw(`${rangeDays} days`)}'`,
      ),
    )
    .orderBy(growthSnapshots.snapshotAt);

  return rows.map((row) => ({
    snapshotAt: row.snapshotAt?.toISOString?.() ?? new Date(row.snapshotAt ?? new Date()).toISOString(),
    value: Number(row.value),
    changeAbs: row.changeAbs !== null ? Number(row.changeAbs) : null,
    changePct: row.changePct !== null ? Number(row.changePct) : null,
  }));
}

export function isValidMetricType(metric: string): metric is GrowthMetricType {
  return growthMetricEnum.enumValues.includes(metric as GrowthMetricType);
}

export function isValidWindow(window: string): window is GrowthSnapshotWindow {
  return snapshotWindowEnum.enumValues.includes(window as GrowthSnapshotWindow);
}
