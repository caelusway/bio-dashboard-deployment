# 🚀 Deployment Summary

## What Was Set Up

Your bio-sync-bot is now ready to deploy as a **single unified app** on Railway that serves both:
- ✅ **bio-dashboard** (Preact/Vite UI)
- ✅ **bio-internal** (Bun/Elysia API)

## Files Created

| File | Purpose |
|------|---------|
| `railway.json` | Railway platform configuration |
| `Procfile` | Process definition for Railway |
| `deploy.sh` | Build script (builds dashboard + installs deps) |
| `QUICKSTART.md` | Quick deployment guide (START HERE!) |
| `RAILWAY_DEPLOYMENT.md` | Comprehensive deployment documentation |
| `apps/bio-internal/src/server.ts` | Updated to serve static files in production |

## How It Works

### Development Mode
```
Terminal 1: cd apps/bio-dashboard && bun run dev    (Port 3000)
Terminal 2: cd apps/bio-internal && bun run dev     (Port 4100)
```

### Production Mode (Railway)
```
Single Server (Port 4100)
├── Serves API routes: /v1/*, /daos/*, /growth/*, etc.
├── Serves API docs: /api-docs
└── Serves Dashboard: / (all other routes)
```

## Quick Deploy

### Option 1: Railway (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Railway deployment"
   git push
   ```

2. **Deploy on Railway**
   - Go to https://railway.app
   - New Project → Deploy from GitHub
   - Select your repo
   - Add environment variables (see below)

3. **Done!** Your app is live at `your-app.up.railway.app`

### Option 2: Test Locally First

```bash
# Build
cd apps/bio-dashboard
bun install && bun run build

# Start
cd ../bio-internal
NODE_ENV=production bun run src/index.ts

# Test
open http://localhost:4100
```

## Required Environment Variables

Add these in Railway dashboard:

```bash
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_DB_URL=postgresql://user:pass@host:5432/db
```

Optional (based on your features):
```bash
TWITTER_BEARER_TOKEN=...
DISCORD_BOT_TOKEN=...
TELEGRAM_BOT_TOKEN=...
```

## Architecture

```
┌─────────────────────────────────────┐
│         Railway Platform            │
├─────────────────────────────────────┤
│  Bun Server (Port 4100)            │
│  ├── API Routes                    │
│  │   ├── /v1/* (Twitter)          │
│  │   ├── /daos/* (DAO Stats)      │
│  │   ├── /growth/* (Metrics)      │
│  │   └── /api-docs (Swagger)      │
│  │                                 │
│  └── Static Files (Dashboard)      │
│      ├── /index.html               │
│      ├── /assets/*                 │
│      └── SPA Routing (fallback)    │
└─────────────────────────────────────┘
```

## Key Features

✨ **Single Domain** - No need for separate frontend/backend URLs
✨ **Automatic Builds** - Push to GitHub → Auto deploy
✨ **SPA Routing** - Client-side routing works correctly
✨ **API Documentation** - Built-in Swagger docs
✨ **CORS Configured** - Proper cross-origin handling
✨ **Environment-Aware** - Different behavior in dev vs production

## What Changed

### `apps/bio-internal/src/server.ts`
- ✅ Added static file serving with `@elysiajs/static`
- ✅ Added production mode detection
- ✅ Added SPA fallback routing
- ✅ Added helpful logging

### `apps/bio-internal/package.json`
- ✅ Added `@elysiajs/static` dependency

### Root Files
- ✅ Created deployment scripts and configs
- ✅ Created comprehensive documentation

## Next Steps

1. **Read** → [QUICKSTART.md](./QUICKSTART.md) for deployment steps
2. **Deploy** → Follow the Railway steps
3. **Monitor** → Check Railway logs and metrics
4. **Customize** → Update environment variables as needed

## Troubleshooting Quick Links

| Issue | Check |
|-------|-------|
| Build fails | Railway logs, verify `deploy.sh` |
| Dashboard not showing | `NODE_ENV=production` set? |
| API errors | Environment variables correct? |
| 404 errors | Check SPA fallback in server.ts |

## Support & Documentation

- 📖 [QUICKSTART.md](./QUICKSTART.md) - Fast deployment guide
- 📚 [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) - Detailed guide
- 🔧 [Railway Docs](https://docs.railway.app) - Platform docs
- 🦊 [Elysia Docs](https://elysiajs.com) - Framework docs

---

**Ready to deploy?** Start with [QUICKSTART.md](./QUICKSTART.md)! 🚀
