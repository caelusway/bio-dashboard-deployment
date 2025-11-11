import { pgEnum, pgTable, uuid, text, timestamp, jsonb, integer, numeric, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const twitterMetricEnum = pgEnum('twitter_metric_type', [
  'retweet_count',
  'reply_count',
  'like_count',
  'quote_count',
  'view_count',
  'bookmark_count',
  'impression_count'
]);

export const orgs = pgTable('orgs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const daoEntities = pgTable('dao_entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  twitterHandle: text('twitter_handle').notNull(),
  metadata: jsonb('metadata').default({}),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  lastTweetId: text('last_tweet_id'),
  followerCount: integer('follower_count'),
  followerCountUpdatedAt: timestamp('follower_count_updated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const twitterPosts = pgTable('twitter_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => orgs.id, { onDelete: 'cascade' }),
  daoId: uuid('dao_id')
    .notNull()
    .references(() => daoEntities.id, { onDelete: 'cascade' }),
  tweetId: text('tweet_id').notNull().unique(),
  author: jsonb('author').notNull(),
  content: text('content'),
  tweetMetrics: jsonb('tweet_metrics').default({}),
  hashtags: jsonb('hashtags').default([]),
  mentions: jsonb('mentions').default([]),
  media: jsonb('media').default([]),
  conversationId: text('conversation_id'),
  inReplyToId: text('in_reply_to_id'),
  inReplyToUserId: text('in_reply_to_user_id'),
  tweetedAt: timestamp('tweeted_at', { withTimezone: true }).notNull(),
  ingestedAt: timestamp('ingested_at', { withTimezone: true }).defaultNow(),
  rawPayload: jsonb('raw_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const twitterPostMetrics = pgTable('twitter_post_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id')
    .notNull()
    .references(() => twitterPosts.id, { onDelete: 'cascade' }),
  metricType: twitterMetricEnum('metric_type').notNull(),
  value: text('value').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow(),
  metadata: jsonb('metadata').default({}),
});

export const orgRelations = relations(orgs, ({ many }) => ({
  profiles: many(profiles),
  daoEntities: many(daoEntities),
  posts: many(twitterPosts),
}));

export const daoRelations = relations(daoEntities, ({ many }) => ({
  posts: many(twitterPosts),
  followerSnapshots: many(daoFollowerSnapshots),
}));

export const postRelations = relations(twitterPosts, ({ many }) => ({
  metrics: many(twitterPostMetrics),
}));

export const daoFollowerSnapshots = pgTable('dao_follower_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  daoId: uuid('dao_id')
    .notNull()
    .references(() => daoEntities.id, { onDelete: 'cascade' }),
  count: integer('count').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow(),
  metadata: jsonb('metadata').default({}),
});


// ================================
// GROWTH ANALYTICS TABLES
// ================================

export const growthPlatformEnum = pgEnum('growth_platform', [
  'discord',
  'telegram',
  'youtube',
  'linkedin',
  'luma',
  'email_newsletter',
  'twitter',
  'website',
  'other',
]);

export const growthMetricEnum = pgEnum('growth_metric', [
  'discord_message_count',
  'discord_member_count',
  'telegram_message_count',
  'telegram_member_count',
  'youtube_total_views',
  'youtube_subscriber_count',
  'youtube_view_count',
  'youtube_total_impressions',
  'youtube_top_video_views',
  'youtube_top_video_impressions',
  'linkedin_follower_count',
  'luma_page_views',
  'luma_subscriber_count',
  'email_newsletter_signup_count',
  'twitter_follower_count',
  'twitter_engagement_count',
  'twitter_impression_count',
  'website_page_views',
  'website_active_users',
  'website_new_users',
  'custom',
]);

export const snapshotWindowEnum = pgEnum('growth_snapshot_window', [
  'day',
  'week',
  'month',
  'quarter',
  'year',
]);

export const growthSources = pgTable('growth_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  platform: growthPlatformEnum('platform').notNull(),
  slug: text('slug').notNull().unique(),
  displayName: text('display_name').notNull(),
  config: jsonb('config').default({}),
  collectionIntervalMinutes: integer('collection_interval_minutes').default(60),
  lastCollectedAt: timestamp('last_collected_at', { withTimezone: true }),
  status: text('status').default('pending'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const growthMetrics = pgTable('growth_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => growthSources.id, { onDelete: 'cascade' }),
  platform: growthPlatformEnum('platform').notNull(),
  metricType: growthMetricEnum('metric_type').notNull(),
  value: numeric('value').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  sourceMetricRecordedIdx: uniqueIndex('growth_metrics_source_metric_recorded_idx').on(table.sourceId, table.metricType, table.recordedAt),
}));

export const growthSnapshots = pgTable('growth_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => growthSources.id, { onDelete: 'cascade' }),
  platform: growthPlatformEnum('platform').notNull(),
  metricType: growthMetricEnum('metric_type').notNull(),
  snapshotWindow: snapshotWindowEnum('snapshot_window').notNull(),
  value: numeric('value').notNull(),
  changeAbs: numeric('change_abs'),
  changePct: numeric('change_pct'),
  snapshotAt: timestamp('snapshot_at', { withTimezone: true }).defaultNow(),
  previousSnapshotAt: timestamp('previous_snapshot_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  snapshotUniqueIdx: uniqueIndex('growth_snapshots_source_metric_window_snapshot_idx').on(
    table.sourceId,
    table.metricType,
    table.snapshotWindow,
    table.snapshotAt,
  ),
}));

export const growthJobs = pgTable('growth_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id')
    .references(() => growthSources.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  status: text('status').default('pending'),
  recordsCollected: integer('records_collected'),
  error: text('error'),
  metadata: jsonb('metadata').default({}),
});

export const growthSourceRelations = relations(growthSources, ({ many }) => ({
  metrics: many(growthMetrics),
  snapshots: many(growthSnapshots),
  jobs: many(growthJobs),
}));

export const growthMetricRelations = relations(growthMetrics, ({ one }) => ({
  source: one(growthSources, {
    fields: [growthMetrics.sourceId],
    references: [growthSources.id],
  }),
}));

export const growthSnapshotRelations = relations(growthSnapshots, ({ one }) => ({
  source: one(growthSources, {
    fields: [growthSnapshots.sourceId],
    references: [growthSources.id],
  }),
}));

export const growthJobRelations = relations(growthJobs, ({ one }) => ({
  source: one(growthSources, {
    fields: [growthJobs.sourceId],
    references: [growthSources.id],
  }),
}));
