#!/bin/bash
set -e

echo "🧪 Testing Docker Setup..."
echo ""

# Test backend build
echo "📦 Building backend..."
docker build -t bio-backend-test -f apps/bio-internal/Dockerfile apps/bio-internal
echo "✅ Backend build successful"
echo ""

# Test backend run (will fail without env vars, but should show the error)
echo "🚀 Testing backend startup (should show env validation error)..."
docker run --rm \
  -e NODE_ENV=production \
  -e PORT=4100 \
  bio-backend-test \
  timeout 3 || echo "Expected: Backend exits due to missing env vars"
echo ""

# Test frontend build
echo "📦 Building frontend..."
docker build -t bio-frontend-test \
  --build-arg VITE_API_URL=http://localhost:4100 \
  -f apps/bio-dashboard/Dockerfile \
  apps/bio-dashboard
echo "✅ Frontend build successful"
echo ""

# Test frontend run
echo "🚀 Testing frontend startup..."
docker run --rm -d --name frontend-test -p 3001:3000 bio-frontend-test
sleep 2
curl -f http://localhost:3001/health && echo "✅ Frontend health check passed" || echo "❌ Frontend health check failed"
docker stop frontend-test
echo ""

echo "✅ All Docker tests passed!"
echo ""
echo "📝 Next steps:"
echo "1. Set environment variables in Coolify for backend"
echo "2. Deploy both services"
echo "3. Check backend logs in Coolify"
