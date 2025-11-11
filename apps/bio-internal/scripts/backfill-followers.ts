import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { daoEntities } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { env } from '../src/config/env';

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

type AccountRow = {
  slug: string;
  follower_count: number | null;
  follower_count_updated_at: string | null;
};

async function main(): Promise<void> {
  const { data, error } = await legacySupabase
    .from<AccountRow>('accounts')
    .select('slug,follower_count,follower_count_updated_at');

  if (error) {
    throw new Error(`Failed to fetch legacy accounts: ${error.message}`);
  }

  const accounts = data ?? [];
  let updated = 0;

  for (const account of accounts) {
    if (!account.slug) continue;

    const count = account.follower_count ?? null;
    const updatedAt = account.follower_count_updated_at
      ? new Date(account.follower_count_updated_at)
      : null;

    await db.update(daoEntities)
      .set({
        followerCount: count,
        followerCountUpdatedAt: updatedAt ?? null,
      })
      .where(eq(daoEntities.slug, account.slug));

    updated += 1;
  }

  console.log(`Follower backfill complete. Updated ${updated} DAO entities.`);
  await targetClient.end();
}

main().catch((error) => {
  console.error('Follower backfill failed:', error);
  process.exit(1);
});
