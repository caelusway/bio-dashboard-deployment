# Coolify Deployment Setup

## Quick Setup

### 1. Create a New Resource in Coolify

1. Go to your Coolify dashboard
2. Click **New Resource** → **Docker Compose**
3. Select your GitHub repository
4. Set **Branch**: `main`
5. Set **Docker Compose Location**: `docker-compose.yml` (in root)

### 2. Configure Environment Variables

In Coolify, go to **Environment Variables** and add these **REQUIRED** variables:

```bash
# Backend (REQUIRED - Service will fail without these!)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_DB_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here
TWITTER_BEARER_TOKEN=AAAAAAAAAA...your-token-here

# Frontend (REQUIRED - Must match your backend domain)
VITE_API_URL=http://backend:4100

# Optional
LOG_LEVEL=info
```

**IMPORTANT**: Without these environment variables, the backend will fail health checks and deployment will fail.

### 3. Deploy

Click **Deploy** in Coolify. It will:
1. Build backend Docker image
2. Build frontend Docker image
3. Start backend container (port 4100)
4. Wait for backend to be healthy
5. Start frontend container (port 3000)
6. Coolify proxy will map your domains to the containers

### 4. Assign Domains

In Coolify:
1. Go to your backend service → **Domains** → Add your backend domain
2. Go to your frontend service → **Domains** → Add your frontend domain
3. Update `VITE_API_URL` to match your backend domain: `https://your-backend.domain.com`
4. Redeploy frontend

## Troubleshooting

### Backend is Unhealthy

Check the logs in Coolify:
```bash
# Look for environment validation errors
❌ Invalid environment configuration
```

**Solution**: Make sure ALL required env vars are set in Coolify UI.

### 502 Bad Gateway

Backend isn't accessible.

**Solution**: Backend now binds to `0.0.0.0:4100` in production. Check:
1. Container is running
2. Health check passes: `wget http://localhost:4100/health`
3. Logs show: `🚀 bio-internal API listening on http://0.0.0.0:4100`

### CORS Errors

Frontend can't access backend.

**Solution**: CORS already allows `.sslip.io` domains. If using custom domain, update `apps/bio-internal/src/server.ts`.

### Port Conflicts

**Solution**: We use standard ports internally (3000 for frontend, 4100 for backend). Coolify's proxy handles external mapping.

## Architecture

```
┌─────────────────────────────────────┐
│ Coolify Proxy (Caddy/Traefik)      │
│ - Frontend: your-app.domain.com    │
│ - Backend:  api.your-app.domain.com│
└─────────────────────────────────────┘
              ↓         ↓
    ┌─────────┘         └─────────┐
    ↓                               ↓
┌─────────┐                    ┌─────────┐
│Frontend │                    │Backend  │
│Port 3000│ ──(API calls)──→   │Port 4100│
│Bun      │                    │Bun      │
└─────────┘                    └─────────┘
```

## Files

- `apps/bio-dashboard/Dockerfile` - Frontend (Bun + Vite build)
- `apps/bio-internal/Dockerfile` - Backend (Bun + Elysia API)
- `docker-compose.yml` - Orchestrates both services
- `.env.example` - Template for environment variables
