/**
 * Twitter API v2 User Information
 */
export interface TwitterUserInfo {
    id: string;
    username: string;
    name: string;
    description?: string;
    profile_image_url?: string;
    verified?: boolean;
    created_at?: string;
    public_metrics: {
        followers_count: number;
        following_count: number;
        tweet_count: number;
        listed_count: number;
    };
}

/**
 * Twitter API v2 Tweet/Post
 */
export interface TwitterPost {
    id: string;
    text: string;
    created_at: string;
    author_id?: string;
    conversation_id?: string;
    in_reply_to_user_id?: string;
    in_reply_to_status_id?: string;
    source?: string;
    lang?: string;
    public_metrics?: {
        retweet_count?: number;
        reply_count?: number;
        like_count?: number;
        quote_count?: number;
        impression_count?: number;
        bookmark_count?: number;
    };
    entities?: {
        hashtags?: Array<{ tag: string }>;
        mentions?: Array<{ id?: string; username?: string; name?: string }>;
        urls?: Array<Record<string, unknown>>;
    };
    attachments?: {
        media_keys?: string[];
    };
}

/**
 * Follower Growth Period
 */
export interface FollowerGrowthPeriod {
    start_date: string;
    end_date: string;
    start_followers: number;
    end_followers: number;
    growth_count: number;
    growth_percentage: number;
}

/**
 * Weekly Growth
 */
export interface WeeklyGrowth extends FollowerGrowthPeriod {
    week_start_date: string;
    week_end_date: string;
}

/**
 * Monthly Growth
 */
export interface MonthlyGrowth extends FollowerGrowthPeriod {
    month_start_date: string;
    month_end_date: string;
}

/**
 * Yearly Growth
 */
export interface YearlyGrowth extends FollowerGrowthPeriod {
    year_start_date: string;
    year_end_date: string;
}

/**
 * Growth Summary
 */
export interface GrowthSummary {
    period_type: 'weekly' | 'monthly' | 'yearly';
    recent_growth_count: number;
    recent_growth_percentage: number;
    average_growth_count: number;
    average_growth_percentage: number;
}

/**
 * Top Growing Account
 */
export interface TopGrowingAccount {
    account_id: string;
    account_name: string;
    twitter_handle: string;
    total_growth: number;
    average_growth_percentage: number;
    current_followers: number;
}

/**
 * Engagement Sync Options
 */
export interface EngagementSyncOptions {
    daysToLookBack: number;
    syncIntervalHours: number;
    maxRequestsPerBatch: number;
}

/**
 * Sync Statistics
 */
export interface SyncStats {
    totalTweetsProcessed: number;
    tweetsUpdated: number;
    tweetsAdded: number;
    apiRequestsUsed: number;
    syncDuration: number;
    errors: string[];
}

/**
 * Rate Limit Status
 */
export interface RateLimitStatus {
    requestsUsedLast15Min: number;
    requestsUsedThisMonth: number;
    postsRetrievedThisMonth: number;
    canMakeRequest: boolean;
    timeUntilReset: number;
    monthlyResetDate: Date;
}

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
    requestsPer15Min: number;
    requestsPerMonth: number;
    postsPerMonth: number;
    delayBetweenRequests: number;
}
