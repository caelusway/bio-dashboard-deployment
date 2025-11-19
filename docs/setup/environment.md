# Environment Variables Guide

This guide explains all environment variables used in the BioProtocol Dashboard monorepo.

## Backend (apps/bio-internal)

### Required Variables

```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Twitter API
TWITTER_BEARER_TOKEN=your-twitter-bearer-token

# Server
PORT=4100
NODE_ENV=development
```

### Optional Variables

```bash
# Twitter Sync Configuration
ENABLE_AUTO_TWITTER_SYNC=true                # Auto-start engagement sync
TWITTER_SYNC_INTERVAL_HOURS=2                # Engagement sync frequency
TWITTER_FOLLOWER_SYNC_INTERVAL_HOURS=24      # Follower sync frequency
TWITTER_DAYS_TO_LOOK_BACK=5                  # Tweet update window
TWITTER_MAX_REQUESTS_PER_BATCH=5             # API batch size

# Logging
LOG_LEVEL=info                               # debug, info, warn, error
```

### Legacy Migration Variables (One-time use)

```bash
# For migrating from old Dao-Social-Tracker database
LEGACY_SUPABASE_URL=https://old-project.supabase.co
LEGACY_SUPABASE_SERVICE_ROLE_KEY=old-service-role-key
LEGACY_SUPABASE_DB_URL=postgresql://...
```

## Frontend (apps/bio-dashboard)

```bash
# API Connection
NEXT_PUBLIC_API_URL=http://localhost:4100

# Supabase (for client-side auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## Docker Environment

For Docker deployments, create a `.env` file at the root with both frontend and backend variables.

### Example `.env` for Docker

```bash
# Backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_DB_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
TWITTER_BEARER_TOKEN=...
PORT=4100
NODE_ENV=production
ENABLE_AUTO_TWITTER_SYNC=true

# Frontend  
NEXT_PUBLIC_API_URL=http://backend:4100
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Security Notes

- ⚠️ **Never commit `.env` files** to version control
- ✅ Use `.env.example` as a template
- ✅ Keep service role keys secure (backend only)
- ✅ Use anon keys for frontend (public, limited access)
- ✅ Rotate keys regularly in production
