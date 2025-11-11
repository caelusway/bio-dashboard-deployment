import 'dotenv/config';
import postgres from 'postgres';
import type { Sql } from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT_DIR = path.resolve(import.meta.dir, '..');
const DRIZZLE_DIR = path.resolve(ROOT_DIR, 'drizzle');

async function main(): Promise<void> {
  const connectionString = process.env['SUPABASE_DB_URL'];

  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL is required to run migrations');
  }

  const client = postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
  });

  try {
    await ensureMigrationTable(client);
    const db = drizzle(client);
    await migrate(db, {
      migrationsFolder: DRIZZLE_DIR,
      migrationsTable: 'drizzle.__drizzle_migrations',
    });
    console.log('✅ Migrations applied successfully');
  } finally {
    await client.end();
  }
}

async function ensureMigrationTable(client: Sql<any>): Promise<void> {
  await client`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await client`
    CREATE TABLE IF NOT EXISTS drizzle."_drizzle_migrations" (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint NOT NULL
    )
  `;

  const preAppliedTags = new Set([
    '0000_mighty_impossible_man',
    '0001_furry_ulik',
    '0002_foamy_namorita',
    '0003_seed_bioprotocol',
  ]);

  const journalPath = path.resolve(DRIZZLE_DIR, 'meta', '_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as {
    entries: Array<{ tag: string; when: number }>;
  };

  for (const entry of journal.entries) {
    if (!preAppliedTags.has(entry.tag)) {
      continue;
    }
    const filePath = path.resolve(DRIZZLE_DIR, `${entry.tag}.sql`);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    const hash = crypto.createHash('sha256').update(sqlContent).digest('hex');

    await client`
      DELETE FROM drizzle."_drizzle_migrations"
      WHERE created_at = ${entry.when}
    `;

    await client`
      INSERT INTO drizzle."_drizzle_migrations" (hash, created_at)
      VALUES (${hash}, ${entry.when})
      ON CONFLICT DO NOTHING
    `;
  }
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
