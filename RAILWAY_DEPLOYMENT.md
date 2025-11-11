# Railway Deployment Guide

This guide will help you deploy both the bio-dashboard UI and bio-internal API as a single app on Railway.

## Architecture

The deployment combines:
- **Frontend**: Bio Dashboard (Preact/Vite) - served as static files
- **Backend**: Bio Internal API (Bun/Elysia) - serves API routes and static files

The API server runs on port 4100 (or PORT env var) and serves:
- API routes under `/v1`, `/daos`, `/growth`, etc.
- API documentation at `/api-docs`
- Dashboard static files at root `/`

## Prerequisites

1. Railway account (https://railway.app)
2. GitHub repository connected to Railway
3. Required environment variables ready

## Deployment Steps

### 1. Create New Project on Railway

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `bio-sync-bot`

### 2. Configure Environment Variables

Add the following environment variables in Railway dashboard:

**Required:**
```
NODE_ENV=production
PORT=4100
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_DB_URL=your_database_url
```

**Optional (if using specific features):**
```
TWITTER_BEARER_TOKEN=your_token
DISCORD_BOT_TOKEN=your_token
TELEGRAM_BOT_TOKEN=your_token
# Add any other env vars your app needs
```

### 3. Deploy

Railway will automatically:
1. Run `./deploy.sh` to build the dashboard
2. Install dependencies for both apps
3. Start the server with `cd apps/bio-internal && NODE_ENV=production bun run src/index.ts`

### 4. Access Your App

Once deployed, Railway will provide you with a URL like:
- `https://your-app.up.railway.app` - Dashboard (frontend)
- `https://your-app.up.railway.app/v1/*` - API endpoints
- `https://your-app.up.railway.app/api-docs` - API documentation

## Project Structure

```
bio-sync-bot/
├── apps/
│   ├── bio-dashboard/        # Frontend (Vite + Preact)
│   │   ├── src/
│   │   ├── dist/            # Built files (created during deploy)
│   │   └── package.json
│   └── bio-internal/         # Backend (Bun + Elysia)
│       ├── src/
│       │   ├── index.ts     # Entry point
│       │   ├── server.ts    # Server setup with static file serving
│       │   └── routes/      # API routes
│       └── package.json
├── deploy.sh                 # Build script
├── railway.json             # Railway configuration
├── Procfile                 # Process configuration
└── RAILWAY_DEPLOYMENT.md    # This file
```

## How It Works

1. **Build Phase** (`deploy.sh`):
   - Builds the dashboard into static files (`apps/bio-dashboard/dist`)
   - Installs API dependencies

2. **Runtime**:
   - Bun server starts on specified PORT
   - API routes are registered (health, twitter, growth, daos)
   - Static plugin serves dashboard files from `dist/`
   - SPA routing: 404s fallback to `index.html`

3. **Development vs Production**:
   - **Dev**: Dashboard runs on `:3000`, API on `:4100` (separate processes)
   - **Production**: Single server on Railway serves both

## Local Testing of Production Build

Test the production setup locally:

```bash
# Build the dashboard
cd apps/bio-dashboard
bun install
bun run build

# Start the API server in production mode
cd ../bio-internal
bun install
NODE_ENV=production bun run src/index.ts
```

Then visit `http://localhost:4100` to see the dashboard served by the API.

## Troubleshooting

### Build Fails
- Check Railway build logs
- Ensure `deploy.sh` has execute permissions
- Verify all dependencies are in package.json files

### Static Files Not Serving
- Verify dashboard build created `dist/` folder
- Check `NODE_ENV=production` is set
- Verify path resolution in `server.ts`

### API Routes Not Working
- Check CORS settings in `server.ts`
- Verify environment variables are set
- Check Railway service logs

### 404 Errors on Dashboard Routes
- Ensure `onError` handler in `server.ts` is working
- SPA routing should fallback to `index.html`

## Updating the Deployment

Push changes to GitHub:
```bash
git add .
git commit -m "your changes"
git push
```

Railway will automatically redeploy.

## Alternative: Manual Railway CLI Deployment

Install Railway CLI:
```bash
npm i -g @railway/cli
```

Deploy:
```bash
railway login
railway link
railway up
```

## Cost Optimization

Railway free tier includes:
- 500 hours of execution time
- $5 of usage

Tips:
- Set appropriate sleep settings if not using 24/7
- Monitor usage in Railway dashboard
- Consider horizontal scaling only if needed

## Support

For issues:
1. Check Railway logs
2. Review this guide
3. Check Railway documentation: https://docs.railway.app
4. Contact your team
