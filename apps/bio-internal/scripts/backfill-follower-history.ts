import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { daoEntities, daoFollowerSnapshots } from '../src/db/schema';
import { createClient } from '@supabase/supabase-js';

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
  id: string;
  slug: string;
};

type HistoryRow = {
  account_id: string;
  follower_count: number;
  recorded_at: string;
};

async function main(): Promise<void> {
  const { data: accounts, error: accountsError } = await legacySupabase
    .from<AccountRow>('accounts')
    .select('id,slug');

  if (accountsError) {
    throw new Error(`Failed to fetch legacy accounts: ${accountsError.message}`);
  }

  const slugByAccountId = new Map((accounts ?? []).map((acc) => [acc.id, acc.slug]));

  const daoRows = await db.select({ id: daoEntities.id, slug: daoEntities.slug }).from(daoEntities);
  const daoIdBySlug = new Map(daoRows.map((row) => [row.slug, row.id]));

  let inserted = 0;

  for (const [accountId, slug] of slugByAccountId.entries()) {
    const daoId = daoIdBySlug.get(slug);
    if (!daoId) continue;

    const { data: history, error: historyError } = await legacySupabase
      .from<HistoryRow>('account_follower_history')
      .select('follower_count,recorded_at')
      .eq('account_id', accountId)
      .order('recorded_at', { ascending: true });

    if (historyError) {
      throw new Error(`Failed follower history for ${slug}: ${historyError.message}`);
    }

    if (!history?.length) continue;

    const rows = history.map((row) => ({
      daoId,
      count: row.follower_count,
      recordedAt: new Date(row.recorded_at),
      metadata: {},
    }));

    await db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        await tx.insert(daoFollowerSnapshots)
          .values(batch)
          .onConflictDoNothing({ target: daoFollowerSnapshots.id });
      }
    });

    inserted += rows.length;
  }

  console.log(`Follower snapshot backfill complete. Inserted ${inserted} rows.`);
  await targetClient.end();
}

main().catch((error) => {
  console.error('Follower history backfill failed:', error);
  process.exit(1);
});
