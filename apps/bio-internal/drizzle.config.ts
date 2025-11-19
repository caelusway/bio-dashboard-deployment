import type { Config } from 'drizzle-kit';
import 'dotenv/config';

if (!process.env.SUPABASE_DB_URL) {
  throw new Error('Missing SUPABASE_DB_URL for Drizzle configuration');
}

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL!,
  },
  breakpoints: true,
} satisfies Config;
