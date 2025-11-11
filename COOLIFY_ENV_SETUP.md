# Coolify Environment Variables Setup

## Critical: Frontend Configuration

### VITE_API_URL (Required for Frontend)

The frontend **MUST** have the `VITE_API_URL` environment variable set to the backend service URL.

#### How to set it in Coolify:

1. Go to your **frontend service** in Coolify
2. Navigate to **Environment Variables** section
3. Add a **build-time** environment variable:
   - Name: `VITE_API_URL`
   - Value: Your backend service URL (see options below)

#### Backend URL Options:

**Option 1: Use Coolify-assigned domain**
```
VITE_API_URL=https://your-backend-domain.sslip.io
```

**Option 2: Use ngrok tunnel**
```
VITE_API_URL=https://your-backend.ngrok-free.app
```

**Option 3: Use internal Docker network (if both services behind same proxy)**
```
VITE_API_URL=http://backend:4100
```

⚠️ **Important**:
- This is a **build-time** variable (not runtime)
- You must **rebuild** the frontend container after changing this
- Check the frontend build logs to confirm the variable is set

---

## Backend Environment Variables

Required for the backend service:

```bash
NODE_ENV=production
PORT=4100
SUPABASE_URL=your-supabase-url
SUPABASE_DB_URL=your-supabase-db-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
TWITTER_BEARER_TOKEN=your-twitter-token
LOG_LEVEL=info
```

Optional:
```bash
SERVE_FRONTEND=false  # Keep as false for separate frontend/backend deployment
```

---

## Verifying Setup

### 1. Check Backend CORS
Backend logs should show:
```
🔌 API-only mode (frontend served separately)
✅ API server configured - ready to handle requests
```

### 2. Check Frontend API Configuration
Open browser console on frontend, you should see:
```
[API] Using API base URL: https://your-backend-domain.sslip.io
```

NOT:
```
[API] Using API base URL: http://localhost:4100  ❌ WRONG
[API] Using API base URL:                        ❌ WRONG (empty)
```

### 3. Test API Connection
```bash
# Test backend health
curl https://your-backend-domain.sslip.io/health

# Test CORS (from frontend origin)
curl -H "Origin: https://your-frontend-domain.ngrok-free.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://your-backend-domain.sslip.io/health
```

---

## Common Issues

### Frontend shows "localhost:4100" in console
- ❌ `VITE_API_URL` not set or empty
- ✅ Set `VITE_API_URL` to backend URL and **rebuild** frontend

### CORS errors in browser
- ❌ Backend not allowing frontend origin
- ✅ Backend already allows `.sslip.io`, `.ngrok-free.app`, `.ngrok.app` domains
- ✅ Check backend logs to confirm origin is being accepted

### 502 Bad Gateway
- ❌ Backend not binding to `0.0.0.0`
- ✅ Ensure `NODE_ENV=production` is set (forces 0.0.0.0 binding)
- ✅ Check backend logs: should show `http://0.0.0.0:4100`

---

## Docker Compose Reference

From `docker-compose.yml`:

```yaml
frontend:
  build:
    context: ./apps/bio-dashboard
    dockerfile: Dockerfile
    args:
      VITE_API_URL: ${VITE_API_URL:-http://backend:4100}  # ← Set this in Coolify
```

The `${VITE_API_URL}` comes from Coolify's environment variables.
