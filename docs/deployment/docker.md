# Docker Deployment Guide

This guide covers deploying both frontend and backend as Docker containers on Railway.

## 🐳 Architecture

```
┌────────────────────────────────────────┐
│ Railway Service 1: Frontend Container │
│ ├─ Image: nginx:alpine                │
│ ├─ Serves: Static files (SPA)         │
│ ├─ Port: 3000                          │
│ └─ Health: /health                     │
└────────────────────────────────────────┘
                  ↓ API Calls
┌────────────────────────────────────────┐
│ Railway Service 2: Backend Container  │
│ ├─ Image: oven/bun:alpine             │
│ ├─ Serves: REST API (Elysia)          │
│ ├─ Port: 4100                          │
│ └─ Health: /health                     │
└────────────────────────────────────────┘
```

## 📦 What's Included

### Backend Dockerfile (`apps/bio-internal/Dockerfile`)
- **Base**: Bun 1.2 Alpine (lightweight)
- **Multi-stage build**: Separates dependencies and runtime
- **Production optimized**: Only production dependencies in final image
- **Health check**: Built-in health monitoring
- **Port**: 4100

### Frontend Dockerfile (`apps/bio-dashboard/Dockerfile`)
- **Build stage**: Bun to build Vite app
- **Runtime stage**: Nginx Alpine to serve static files
- **SPA support**: Proper fallback routing for single-page app
- **Caching**: Optimized cache headers for assets
- **Gzip**: Automatic compression
- **Health check**: `/health` endpoint
- **Port**: 3000

## 🚀 Railway Deployment

### Method 1: Using Railway Dashboard (Recommended)

#### Backend Service

1. **Create New Service**
   - Go to Railway dashboard
   - New Project → Deploy from GitHub
   - Select your repository

2. **Configure Backend**
   - Service name: `bio-internal-api`
   - Settings → Source → Root Directory: `apps/bio-internal`
   - Railway will auto-detect `railway.toml` and use Docker

3. **Environment Variables**
   ```bash
   NODE_ENV=production
   PORT=4100
   DATABASE_URL=postgresql://...
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...
   ```

4. **Deploy**
   - Railway builds Docker image automatically
   - Copy the generated URL (e.g., `https://bio-internal-xxx.railway.app`)

#### Frontend Service

1. **Add New Service** (in same project)
   - New Service → GitHub Repo → Same repo

2. **Configure Frontend**
   - Service name: `bio-dashboard-frontend`
   - Settings → Source → Root Directory: `apps/bio-dashboard`
   - Railway will auto-detect `railway.toml` and use Docker

3. **Environment Variables**
   ```bash
   VITE_API_URL=https://bio-internal-xxx.railway.app
   ```
   ⚠️ Use the backend URL from step above

4. **Deploy**
   - Railway builds Docker image with nginx
   - Frontend will be available at generated Railway URL

### Method 2: Using Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy backend
cd apps/bio-internal
railway up

# Deploy frontend (in new terminal)
cd apps/bio-dashboard
railway up
```

## 🧪 Local Docker Testing

### Build and Test Backend

```bash
cd apps/bio-internal

# Build image
docker build -t bio-internal:local .

# Run container
docker run -p 4100:4100 \
  -e NODE_ENV=production \
  -e DATABASE_URL=your_db_url \
  -e SUPABASE_URL=your_supabase_url \
  -e SUPABASE_SERVICE_KEY=your_key \
  bio-internal:local

# Test
curl http://localhost:4100/health
```

### Build and Test Frontend

```bash
cd apps/bio-dashboard

# Build image
docker build -t bio-dashboard:local \
  --build-arg VITE_API_URL=http://localhost:4100 .

# Run container
docker run -p 3000:3000 bio-dashboard:local

# Test
open http://localhost:3000
```

## 🐳 Docker Compose (Local Development)

Create `docker-compose.yml` in root:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: apps/bio-internal/Dockerfile
    ports:
      - "4100:4100"
    environment:
      - NODE_ENV=production
      - PORT=4100
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4100/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: apps/bio-dashboard/Dockerfile
      args:
        - VITE_API_URL=http://localhost:4100
    ports:
      - "3000:3000"
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3

volumes:
  data:
```

Run with:
```bash
docker-compose up --build
```

## 🔍 Troubleshooting

### Container Won't Start

**Check logs:**
```bash
# Railway dashboard → Service → Deployments → View Logs

# Or with CLI
railway logs
```

**Common issues:**
- Missing environment variables
- Port conflicts
- Build failures

### Frontend Can't Connect to Backend

**Verify:**
1. `VITE_API_URL` is set correctly
2. Backend is running and accessible
3. CORS is configured properly
4. Network connectivity between services

**Test backend:**
```bash
curl https://your-backend.railway.app/health
```

### Build Takes Too Long

**Optimize:**
1. Use `.dockerignore` to exclude unnecessary files
2. Leverage Docker layer caching
3. Use multi-stage builds (already implemented)

### Image Too Large

**Check size:**
```bash
docker images | grep bio-
```

**Current sizes:**
- Backend: ~100MB (Bun Alpine)
- Frontend: ~50MB (Nginx Alpine)

## 📊 Comparison: Docker vs Nixpacks

| Feature | Docker | Nixpacks |
|---------|--------|----------|
| **Control** | Full control over build | Automatic detection |
| **Size** | Optimized (~100MB) | Larger (~500MB+) |
| **Speed** | Faster with cache | Slower builds |
| **Flexibility** | Custom nginx config | Limited customization |
| **Debugging** | Easier to debug | Black box |
| **Best for** | Production | Quick prototypes |

**Recommendation**: Use Docker for production deployments.

## 🔐 Security Best Practices

### Implemented

✅ Multi-stage builds (smaller attack surface)
✅ Alpine Linux (minimal base image)
✅ Non-root user (nginx runs as nginx user)
✅ Health checks (monitor container health)
✅ `.dockerignore` (exclude sensitive files)
✅ Security headers in nginx

### Additional Recommendations

- Use specific image tags (not `latest`)
- Scan images for vulnerabilities: `docker scan bio-internal:local`
- Keep base images updated
- Use secrets management for sensitive env vars
- Enable Railway's private networking

## 📈 Monitoring

Railway provides built-in monitoring:
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time container logs
- **Health Checks**: Automatic restart on failure
- **Alerts**: Configure notifications

## 💰 Cost Optimization

1. **Resource Limits**: Set appropriate CPU/memory limits
2. **Auto-scaling**: Configure based on traffic
3. **Sleep Policy**: Hibernate services during low traffic
4. **Caching**: Use Railway's CDN for static assets

## 🔄 CI/CD Pipeline

Railway automatically:
1. Detects push to GitHub
2. Builds Docker images
3. Runs health checks
4. Deploys if successful
5. Rolls back if health checks fail

## 📚 Additional Resources

- [Railway Docker Docs](https://docs.railway.app/deploy/dockerfiles)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Bun Docker Images](https://bun.sh/docs/install/docker)

## ✅ Verification Checklist

After deployment:

- [ ] Backend health check: `https://backend.railway.app/health`
- [ ] Frontend loads: `https://frontend.railway.app`
- [ ] API calls work from frontend
- [ ] All pages load correctly
- [ ] Browser console has no errors
- [ ] Railway logs show no errors
- [ ] Health checks pass
