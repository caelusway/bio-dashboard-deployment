# Quick Start: Deploy to Railway

Deploy your bio-dashboard + bio-internal API to Railway in minutes.

## 🚀 One-Click Deploy Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Add Railway deployment configuration"
git push
```

### 2. Deploy on Railway

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `bio-sync-bot` repository
5. Railway will automatically detect the configuration

### 3. Add Environment Variables

In Railway dashboard, add these variables:

```bash
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_DB_URL=your_database_connection_string
```

### 4. Done! 🎉

Railway will:
- ✅ Install dependencies
- ✅ Build the dashboard
- ✅ Start the API server
- ✅ Serve everything on one domain

Your app will be live at: `https://your-app.up.railway.app`

## 📍 Routes

- `/` - Dashboard (UI)
- `/v1/*` - API endpoints
- `/api-docs` - API documentation
- `/health` - Health check

## 🧪 Test Locally First

Build and test the production setup:

```bash
# 1. Build dashboard
cd apps/bio-dashboard
bun install && bun run build

# 2. Start API server
cd ../bio-internal
bun install
NODE_ENV=production bun run src/index.ts

# 3. Visit http://localhost:4100
```

## 🔧 Files Created

- `railway.json` - Railway configuration
- `deploy.sh` - Build script
- `Procfile` - Process definition
- `RAILWAY_DEPLOYMENT.md` - Full deployment guide

## 💡 What Happens

The deployment combines two apps into one:

```
Railway Server (Port 4100)
├── API Routes (/v1, /daos, /growth, etc.)
└── Static Files (Dashboard UI)
```

## ⚙️ Environment Variables You May Need

**Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_DB_URL`

**Optional:**
- `TWITTER_BEARER_TOKEN`
- `DISCORD_BOT_TOKEN`
- `TELEGRAM_BOT_TOKEN`

## 🐛 Troubleshooting

**Build fails?**
- Check Railway logs in dashboard
- Verify `deploy.sh` ran successfully

**Dashboard not showing?**
- Check `NODE_ENV=production` is set
- Visit `/api` endpoint to verify server is running

**API errors?**
- Verify all environment variables are set
- Check service logs in Railway dashboard

## 📚 Need More Help?

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed instructions.
