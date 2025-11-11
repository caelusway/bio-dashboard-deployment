import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env';
import * as schema from './schema';

export const client = postgres(env.SUPABASE_DB_URL, {
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(client, { schema });
