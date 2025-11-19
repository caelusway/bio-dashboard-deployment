import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createClient } from '@supabase/supabase-js';
import { daoEntities, twitterPosts } from '../src/db/schema';
import type { InferModel } from 'drizzle-orm';
import { eq, sql } from 'drizzle-orm';

const REQUIRED_ENV = [
  'SUPABASE_DB_URL',
  'LEGACY_SUPABASE_URL',
  'LEGACY_SUPABASE_SERVICE_ROLE_KEY',
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var ${key}`);
  }
}

const ORG_ID = process.env['BIO_ORG_ID'] ?? '00000000-0000-0000-0000-000000000001';

const targetClient = postgres(process.env['SUPABASE_DB_URL']!, {
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(targetClient, { schema: { daoEntities, twitterPosts } });

const legacySupabase = createClient(
  process.env['LEGACY_SUPABASE_URL']!,
  process.env['LEGACY_SUPABASE_SERVICE_ROLE_KEY']!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

const legacyDbUrl = process.env['LEGACY_SUPABASE_DB_URL'];
const legacyPg = legacyDbUrl
  ? postgres(legacyDbUrl, {
    ssl: { rejectUnauthorized: false },
  })
  : null;

type LegacyTweet = {
  id: string;
  text: string | null;
  retweet_count: number | null;
  reply_count: number | null;
  like_count: number | null;
  quote_count: number | null;
  view_count: number | null;
  bookmark_count: number | null;
  created_at: string;
  is_reply: boolean | null;
  in_reply_to_id: string | null;
  conversation_id: string | null;
  in_reply_to_user_id: string | null;
  in_reply_to_username: string | null;
  author_username: string | null;
  author_name: string | null;
  author_id: string | null;
  mentions: any;
  hashtags: any;
  urls: any;
  media: any;
  raw_data: any;
  synced_at: string | null;
  updated_at: string | null;
  twitter_url: string | null;
  url: string | null;
  type: string | null;
  source: string | null;
  lang: string | null;
};

const BATCH_SIZE = 1000;

const formatName = (slug: string) =>
  slug
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

type AccountRow = {
  slug: string;
  name: string | null;
  twitter_handle: string | null;
};

async function ensureDaoEntity(account: AccountRow): Promise<string> {
  const slug = account.slug;
  const handle = account.twitter_handle ?? slug;
  const name = account.name ?? formatName(slug);

  const inserted = await db
    .insert(daoEntities)
    .values({
      orgId: ORG_ID,
      slug,
      name,
      twitterHandle: handle,
    })
    .onConflictDoNothing({ target: daoEntities.slug })
    .returning({ id: daoEntities.id });

  if (inserted.length > 0) {
    return inserted[0]!.id;
  }

  const existing = await db
    .select({ id: daoEntities.id })
    .from(daoEntities)
    .where(eq(daoEntities.slug, slug))
    .limit(1);

  if (!existing[0]) {
    throw new Error(`Unable to resolve DAO entity for slug ${slug}`);
  }

  return existing[0].id;
}

async function migrateAccount(account: AccountRow) {
  const { slug } = account;
  const daoId = await ensureDaoEntity(account);
  let offset = 0;
  let total = 0;

  while (true) {
    const tableName = `account_${slug}_tweets`;

    const { data, error } = await legacySupabase
      .from<LegacyTweet>(tableName)
      .select('*')
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      if ((error as any).code === '42P01') {
        console.warn(`Table ${tableName} not found, skipping.`);
        break;
      }
      throw new Error(`Legacy fetch failed for ${slug}: ${error.message}`);
    }

    const rows = data ?? [];

    if (!rows.length) {
      break;
    }

    const values: InferModel<typeof twitterPosts, 'insert'>[] = rows.map((row) => ({
      orgId: ORG_ID,
      daoId,
      tweetId: row.id,
      author: {
        username: row.author_username,
        name: row.author_name,
        id: row.author_id,
      },
      content: row.text ?? undefined,
      tweetMetrics: {
        retweet_count: row.retweet_count ?? 0,
        reply_count: row.reply_count ?? 0,
        like_count: row.like_count ?? 0,
        quote_count: row.quote_count ?? 0,
        view_count: row.view_count ?? 0,
        bookmark_count: row.bookmark_count ?? 0,
      },
      hashtags: row.hashtags ?? [],
      mentions: row.mentions ?? [],
      media: row.media ?? [],
      conversationId: row.conversation_id ?? undefined,
      inReplyToId: row.in_reply_to_id ?? undefined,
      inReplyToUserId: row.in_reply_to_user_id ?? undefined,
      tweetedAt: new Date(row.created_at),
      ingestedAt: row.synced_at ? new Date(row.synced_at) : new Date(),
      rawPayload: row.raw_data ?? null,
    }));

    if (values.length) {
      await db
        .insert(twitterPosts)
        .values(values)
        .onConflictDoUpdate({
          target: twitterPosts.tweetId,
          set: {
            content: sql`excluded.content`,
            tweetMetrics: sql`excluded.tweet_metrics`,
            hashtags: sql`excluded.hashtags`,
            mentions: sql`excluded.mentions`,
            media: sql`excluded.media`,
            conversationId: sql`excluded.conversation_id`,
            inReplyToId: sql`excluded.in_reply_to_id`,
            inReplyToUserId: sql`excluded.in_reply_to_user_id`,
            updatedAt: sql`NOW()`,
          },
        });
    }

    total += values.length;
    offset += rows.length;
    console.log(`Migrated ${values.length} tweets for ${slug} (total ${total})`);
  }

  console.log(`Finished migrating ${slug}: ${total} rows.`);
}

async function main() {
  let daoNameList: string[] = [];
  let accounts: AccountRow[] = [];

  if (legacyPg) {
    const rows = await legacyPg<{
      table_name: string;
    }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'account_%_tweets'
      ORDER BY table_name;
    `;

    daoNameList = rows
      .map((row) => row.table_name.replace(/^account_/, '').replace(/_tweets$/, ''))
      .filter(Boolean);
  } else {
    const { data, error } = await legacySupabase
      .from<AccountRow>('accounts')
      .select('slug,name,twitter_handle');

    if (error) {
      throw new Error(`Failed to list accounts: ${error.message}`);
    }

    accounts = data ?? [];
    daoNameList = accounts.map((acc) => acc.slug).filter(Boolean);
  }

  if (!accounts.length) {
    const { data, error } = await legacySupabase
      .from<AccountRow>('accounts')
      .select('slug,name,twitter_handle');

    if (error) {
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }

    accounts = data ?? [];
  }

  const accountMap = new Map(accounts.map((acc) => [acc.slug, acc]));

  for (const slug of daoNameList) {
    if (!slug) continue;
    const account = accountMap.get(slug) ?? { slug, name: null, twitter_handle: null };
    await migrateAccount(account);
  }

  await legacyPg?.end();
  await targetClient.end();
  console.log('Migration complete.');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
