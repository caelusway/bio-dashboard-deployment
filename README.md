# Bio Dashboard + Internal API

Production deployment repository for Bio Dashboard and Internal API.

## 🚀 Quick Deploy to Railway

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push
   ```

2. **Deploy on Railway:**
   - Go to https://railway.app
   - New Project → Deploy from GitHub
   - Select this repository

3. **Add Environment Variables:**
   ```
   NODE_ENV=production
   SUPABASE_URL=your_url
   SUPABASE_SERVICE_KEY=your_key
   SUPABASE_DB_URL=your_db_url
   ```

4. **Done!** Your app is live at `your-app.up.railway.app`

## 📁 Structure

```
.
├── apps/
│   ├── bio-dashboard/     # Frontend UI (Preact + Vite)
│   └── bio-internal/      # Backend API (Bun + Elysia)
├── railway.json          # Railway config
├── deploy.sh            # Build script
└── Procfile             # Process config
```

## 🧪 Local Development

**Dashboard:**
```bash
cd apps/bio-dashboard
bun install
bun run dev
# Visit http://localhost:3000
```

**API:**
```bash
cd apps/bio-internal
bun install
bun run dev
# Visit http://localhost:4100
```

## 📦 Production Build

Test the production setup locally:

```bash
# Build dashboard
cd apps/bio-dashboard
bun install && bun run build

# Start API (serves both)
cd ../bio-internal
NODE_ENV=production bun run src/index.ts

# Visit http://localhost:4100
```

## 📚 Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Quick deployment guide
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) - Full documentation
- [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) - Architecture overview

## 🛠️ Tech Stack

- **Frontend:** Preact + Vite + TailwindCSS
- **Backend:** Bun + Elysia + Drizzle ORM
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Railway

## ⚙️ Environment Variables

**Required:**
- `NODE_ENV` - Set to `production`
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `SUPABASE_DB_URL` - Direct database connection string

**Optional:**
- `TWITTER_BEARER_TOKEN`
- `DISCORD_BOT_TOKEN`
- `TELEGRAM_BOT_TOKEN`

## 🔗 Routes

- `/` - Dashboard UI
- `/v1/*` - API endpoints
- `/daos/*` - DAO stats
- `/growth/*` - Growth metrics
- `/api-docs` - API documentation

## 📄 License

MIT
