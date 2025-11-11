import { Elysia, t } from 'elysia';
// import { authMiddleware } from '../middleware/auth';
// import { roleGuard } from '../middleware/roles';
import {
  getGrowthSourceSummaries,
  getGrowthHistory,
  isValidMetricType,
  isValidWindow,
  GrowthSnapshotWindow,
  GrowthMetricType,
} from '../services/growthAnalytics';

// TODO: Re-enable auth in Phase 2
// For MVP read-only dashboard, auth is disabled
// NOTE: Using /api instead of /v1 to bypass global auth middleware
export const growthRoutes = new Elysia({ prefix: '/api/growth' })
  .get('/sources', async ({ query, set }) => {
    const windowParam = typeof query.window === 'string' ? query.window.toLowerCase() : undefined;
    const window: GrowthSnapshotWindow = isValidWindow(windowParam ?? '') ? (windowParam as GrowthSnapshotWindow) : 'day';

    if (windowParam && !isValidWindow(windowParam)) {
      set.status = 400;
      return { error: `Invalid window parameter: ${query.window}` };
    }

    const data = await getGrowthSourceSummaries(window);
    return { data };
  })
  .get('/history/:slug', async ({ params, query, set }) => {
    const metricParam = typeof query.metric === 'string' ? query.metric.toLowerCase() : undefined;
    if (!metricParam || !isValidMetricType(metricParam)) {
      set.status = 400;
      return { error: 'Query parameter "metric" is required and must be a known growth metric type.' };
    }

    const windowParam = typeof query.window === 'string' ? query.window.toLowerCase() : undefined;
    if (windowParam && !isValidWindow(windowParam)) {
      set.status = 400;
      return { error: `Invalid window parameter: ${query.window}` };
    }

    const rangeParam = query.range ? Number(query.range) : undefined;
    if (rangeParam !== undefined && (Number.isNaN(rangeParam) || rangeParam <= 0)) {
      set.status = 400;
      return { error: 'Query parameter "range" must be a positive number of days.' };
    }

    const history = await getGrowthHistory(
      params.slug,
      metricParam as GrowthMetricType,
      windowParam && isValidWindow(windowParam) ? (windowParam as GrowthSnapshotWindow) : 'day',
      rangeParam ?? undefined,
    );

    return { data: history };
  });
