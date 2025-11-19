// Force loading .env file from current directory if not already loaded
// import { file } from 'bun';
// import { resolve } from 'path';

// import { env } from '../src/config/env';
import { createClient } from '@supabase/supabase-js';

// Manual env var access to avoid strict schema validation from src/config/env
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

/**
 * One-time script to specifically sync tweets for NEURONGale
 * and populate the legacy table structure (simulated) for the last 25 tweets.
 */
async function syncNeurongaleTweets() {
    const TARGET_USERNAME = 'NEURONGale';
    const TWEET_COUNT = 25;
    const LEGACY_TABLE_NAME = 'account_neurongale_tweets';
    
    console.log(`🚀 Starting specific sync for @${TARGET_USERNAME}...`);

    // Check Legacy Credentials
    const legacyUrl = process.env.LEGACY_SUPABASE_URL;
    const legacyKey = process.env.LEGACY_SUPABASE_SERVICE_ROLE_KEY;

    if (!legacyUrl || !legacyKey) {
        console.error('❌ LEGACY_SUPABASE_URL or LEGACY_SUPABASE_SERVICE_ROLE_KEY not found in environment');
        console.log('   Please ensure you are running with the correct .env file loaded.');
        process.exit(1);
    }

    if (!TWITTER_BEARER_TOKEN) {
        console.error('❌ TWITTER_BEARER_TOKEN is not set in environment variables');
        process.exit(1);
    }

    // Initialize Legacy Supabase Client
    console.log(`🔌 Connecting to Legacy Supabase: ${legacyUrl}`);
    const legacySupabase = createClient(legacyUrl, legacyKey);

    // Helper for Twitter API requests using fetch
    const twitterFetch = async (url: string) => {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`
            }
        });
        if (!response.ok) {
            throw new Error(`Twitter API Error: ${response.status} ${response.statusText} - ${await response.text()}`);
        }
        return response.json();
    };

    try {
        // 1. Fetch last 25 tweets from Twitter API
        console.log(`📥 Fetching last ${TWEET_COUNT} tweets from Twitter API...`);
        
        const userResponse = await twitterFetch(`https://api.twitter.com/2/users/by/username/${TARGET_USERNAME}?user.fields=profile_image_url,public_metrics,verified,created_at,description`);
        const user = userResponse.data;
        
        if (!user) {
            console.error(`❌ Twitter user @${TARGET_USERNAME} not found on Twitter`);
            process.exit(1);
        }

        const tweetsResponse = await twitterFetch(
            `https://api.twitter.com/2/users/${user.id}/tweets?max_results=${Math.max(10, TWEET_COUNT)}&tweet.fields=created_at,public_metrics,entities,conversation_id,in_reply_to_user_id,referenced_tweets,lang,source&expansions=author_id,referenced_tweets.id,in_reply_to_user_id,attachments.media_keys&media.fields=url,preview_image_url,type,height,width`
        );

        const tweetsData = tweetsResponse.data || [];
        const tweetsIncludes = tweetsResponse.includes || {};
        
        console.log(`📊 Fetched ${tweetsData.length} tweets`);

        // 2. Insert into Legacy DB Table
        let updatedCount = 0;
        let errorCount = 0;

        for (const tweet of tweetsData) {
            const metrics = tweet.public_metrics || {};
            
            // Find media objects if any
            const media: any[] = [];
            if (tweet.attachments?.media_keys && tweetsIncludes.media) {
                for (const key of tweet.attachments.media_keys) {
                    const m = tweetsIncludes.media.find((med: any) => med.media_key === key);
                    if (m) media.push(m);
                }
            }

            // Extract tweet URL (Assuming pattern https://twitter.com/username/status/tweetId)
            const tweetUrl = `https://twitter.com/${user.username}/status/${tweet.id}`;
            const url = tweetUrl; // Map to 'url' field if it exists in legacy

            // Map to Legacy Schema
            // Based on migrate-twitter.ts structure
            const legacyRow = {
                id: tweet.id,
                author_id: user.id,
                author_name: user.name,
                author_username: user.username,
                text: tweet.text,
                created_at: new Date(tweet.created_at).toISOString(),
                conversation_id: tweet.conversation_id || null,
                in_reply_to_user_id: tweet.in_reply_to_user_id || null,
                retweet_count: metrics.retweet_count || 0,
                reply_count: metrics.reply_count || 0,
                like_count: metrics.like_count || 0,
                quote_count: metrics.quote_count || 0,
                view_count: metrics.impression_count || 0,
                bookmark_count: metrics.bookmark_count || 0,
                media: media,
                hashtags: tweet.entities?.hashtags || [],
                mentions: tweet.entities?.mentions || [],
                synced_at: new Date().toISOString(),
                url: url,
                twitter_url: tweetUrl,
                // raw_data: tweet // Optional: if legacy table has this
            };

            const { error } = await legacySupabase
                .from(LEGACY_TABLE_NAME)
                .upsert(legacyRow, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Failed to upsert tweet ${tweet.id}:`, error.message);
                errorCount++;
            } else {
                updatedCount++;
            }
        }

        console.log(`✅ Sync completed for @${TARGET_USERNAME}`);
        console.log(`   Success: ${updatedCount}`);
        console.log(`   Errors:  ${errorCount}`);
        console.log(`   Target Table: ${LEGACY_TABLE_NAME} @ Legacy DB`);

    } catch (error) {
        console.error('❌ Error during sync:', error);
        process.exit(1);
    }
}

// Run execution
syncNeurongaleTweets()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

