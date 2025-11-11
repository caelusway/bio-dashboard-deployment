#!/usr/bin/env bun
/**
 * Seed Growth Sources
 * Creates initial growth sources for all platforms
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { growthSources } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// Direct DB connection without env validation
const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ SUPABASE_DB_URL is required');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

const sources = [
  {
    platform: 'discord' as const,
    slug: 'discord',
    displayName: 'Discord',
    config: {},
    collectionIntervalMinutes: 60,
    status: 'active',
    metadata: {
      description: 'BioProtocol Discord server',
      icon: '💬',
    },
  },
  {
    platform: 'telegram' as const,
    slug: 'telegram',
    displayName: 'Telegram',
    config: {},
    collectionIntervalMinutes: 60,
    status: 'active',
    metadata: {
      description: 'BioProtocol Telegram community',
      icon: '✈️',
    },
  },
  {
    platform: 'twitter' as const,
    slug: 'twitter',
    displayName: 'Twitter',
    config: {},
    collectionIntervalMinutes: 120,
    status: 'active',
    metadata: {
      description: 'BioProtocol Twitter account',
      icon: '🐦',
    },
  },
  {
    platform: 'youtube' as const,
    slug: 'youtube',
    displayName: 'YouTube',
    config: {},
    collectionIntervalMinutes: 120,
    status: 'active',
    metadata: {
      description: 'BioProtocol YouTube channel',
      icon: '📺',
    },
  },
  {
    platform: 'linkedin' as const,
    slug: 'linkedin',
    displayName: 'LinkedIn',
    config: {},
    collectionIntervalMinutes: 240,
    status: 'pending',
    metadata: {
      description: 'BioProtocol LinkedIn page',
      icon: '💼',
    },
  },
  {
    platform: 'luma' as const,
    slug: 'luma',
    displayName: 'Luma',
    config: {},
    collectionIntervalMinutes: 180,
    status: 'active',
    metadata: {
      description: 'Luma events and subscribers',
      icon: '🎪',
    },
  },
  {
    platform: 'email_newsletter' as const,
    slug: 'email_newsletter',
    displayName: 'Email Newsletter',
    config: {},
    collectionIntervalMinutes: 360,
    status: 'active',
    metadata: {
      description: 'Webflow email newsletter signups',
      icon: '📧',
    },
  },
  {
    platform: 'website' as const,
    slug: 'website_bio',
    displayName: 'Website (bio.xyz)',
    config: {},
    collectionIntervalMinutes: 1440, // Daily
    status: 'active',
    metadata: {
      description: 'bio.xyz website analytics',
      icon: '🌐',
    },
  },
  {
    platform: 'website' as const,
    slug: 'website_app',
    displayName: 'Website (app.bio.xyz)',
    config: {},
    collectionIntervalMinutes: 1440, // Daily
    status: 'active',
    metadata: {
      description: 'app.bio.xyz website analytics',
      icon: '🌐',
    },
  },
];

async function main() {
  console.log('🌱 Seeding growth sources...\n');

  for (const source of sources) {
    try {
      // Check if already exists
      const existing = await db
        .select()
        .from(growthSources)
        .where(eq(growthSources.slug, source.slug))
        .limit(1);

      if (existing.length > 0) {
        console.log(`✓ Source already exists: ${source.displayName}`);
        continue;
      }

      await db.insert(growthSources).values(source);
      console.log(`✓ Created source: ${source.displayName}`);
    } catch (error) {
      console.error(`❌ Failed to create ${source.displayName}:`, error);
    }
  }

  console.log('\n✅ Growth sources seeded successfully!');

  // Close connection
  await sql.end();
}

main();
