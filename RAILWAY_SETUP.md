# Railway Deployment Setup

## Architecture

This project uses a **single-service architecture** on Railway where the backend serves both API and frontend:

```
Railway URL (https://your-app.railway.app)
           ↓
    Elysia Backend (PORT from Railway)
           ↓
    ├── /api/*        → API routes
    ├── /v1/*         → API routes
    ├── /health       → Health check
    └── /*            → Frontend (from apps/bio-dashboard/dist)
```

## How It Works

### Backend (apps/bio-internal)
- Listens on `process.env.PORT` (provided by Railway) or 4100 (local dev)
- Binds to `0.0.0.0` in production for public access
- Serves API routes
- Serves static frontend files in production using Bun's native file serving

### Frontend (apps/bio-dashboard)
- Built as static files to `apps/bio-dashboard/dist`
- API calls use:
  - **Production**: Empty base URL `''` (relative URLs to same domain)
  - **Development**: `http://localhost:4100` (local backend)

## Deployment Process

1. **Build**: `./deploy.sh` builds dashboard and installs dependencies
2. **Start**: Railway runs `cd apps/bio-internal && NODE_ENV=production bun run src/index.ts`
3. **Access**: Frontend and API are both available at your Railway URL

## Environment Variables (Railway)

Required environment variables in Railway dashboard:

```bash
NODE_ENV=production
DATABASE_URL=your_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_key
# PORT is automatically set by Railway
```

Optional:
```bash
VITE_API_URL=  # Only if you want to override API URL
```

## Local Development

### Frontend (Port 3000)
```bash
cd apps/bio-dashboard
bun install
bun run dev
```

### Backend (Port 4100)
```bash
cd apps/bio-internal
bun install
bun run dev
```

Frontend will proxy API requests to `http://localhost:4100` automatically.

## Alternative: Separate Services

If you need frontend and backend on separate Railway services:

1. Create two services in Railway
2. Deploy backend to Service 1
3. Deploy frontend to Service 2 with:
   ```bash
   VITE_API_URL=https://backend-service-url.railway.app
   ```
4. Configure CORS in backend to allow frontend domain

**Not recommended** - costs 2x and adds complexity.
