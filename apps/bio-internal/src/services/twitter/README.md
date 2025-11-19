# Twitter Tracking Services

This directory contains the Twitter follower and engagement tracking system migrated from the legacy `Dao-Social-Tracker` project.

## Services

### TwitterFollowerService
Handles Twitter follower count tracking and growth analytics.

**Key features:**
- Fetch follower counts for DAOs via Twitter API
- Record daily follower snapshots in `dao_follower_snapshots`
- Calculate growth metrics over time periods (days, weeks, months)
- Batch processing with rate limiting
- Top DAOs by follower count ranking

**Usage:**
```typescript
import { TwitterFollowerService } from './services/twitter';

const service = new TwitterFollowerService();
await service.updateAllFollowerCounts();
```

### EngagementSyncService
Handles tweet fetching and engagement metric tracking.

**Key features:**
- Fetch new tweets from DAO Twitter timelines
- Update engagement metrics (likes, retweets, replies, views) for recent tweets
- Automatic sync with configurable intervals
- Rate limiting and error handling with API cooldown periods
- Validation and sanitization of tweet data

**Usage:**
```typescript
import { EngagementSyncService } from './services/twitter';

const service = new EngagementSyncService();
await service.runEngagementSync();
```

### RateLimitManager
Manages Twitter API rate limits to prevent exceeding quotas.

**Key features:**
- Tracks requests in 15-minute windows (15 requests per 15 mins)
- Monthly quota tracking (50k requests, 15k posts)
- Automatic waiting when limits are reached
- Usage statistics and monitoring

### SyncLogger
Structured logging for sync operations.

**Features:**
- Log levels: DEBUG, INFO, WARN, ERROR
- Formatted console output with timestamps
- Sync statistics tracking

## Configuration

Twitter API settings are in `twitterConfig.ts`:
- `TWITTER_CONFIG.BASE_URL`: Twitter API v2 base URL
- `RATE_LIMITS.TWEETS_PER_15_MIN`: Rate limit threshold
- `RATE_LIMITS.DELAY_BETWEEN_REQUESTS`: Delay between API calls

## Jobs

Dedicated jobs for running sync operations:

### followerSync.ts
Run daily follower tracking:
```bash
bun run sync:followers
```

### engagementSync.ts
Run engagement metric updates:
```bash
bun run sync:engagement
```

## Rate Limiting

The Twitter API has strict rate limits:
- **15 requests per 15 minutes** for timeline endpoints
- **300 requests per 15 minutes** for user lookups
- **Monthly quotas** for API usage

The services automatically handle rate limiting with delays and waiting periods. If rate limits are exceeded, the system waits for reset before continuing.

## Database Schema

### dao_entities
- `followerCount`: Current follower count
- `followerCountUpdatedAt`: Last time followers were updated
- `lastTweetId`: Last synced tweet ID for incremental fetching

### dao_follower_snapshots
- `daoId`: Reference to DAO
- `count`: Follower count at snapshot time
- `recordedAt`: Timestamp of snapshot

### twitter_posts
- `tweetId`: Unique Twitter tweet ID
- `daoId`: Reference to DAO
- `tweetMetrics`: JSON with engagement metrics
- `tweetedAt`: When tweet was posted
- `ingestedAt`: When tweet was synced

## Error Handling

- **API errors**: 15-minute cooldown period before retry
- **Rate limits**: Automatic waiting and batch processing
- **Validation errors**: Detailed logging with data sanitization
- **Network errors**: Graceful error handling with retry logic
