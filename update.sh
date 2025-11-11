#!/bin/bash
set -e

echo "🔄 Bio Dashboard Update Script"
echo "=============================="
echo ""

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull origin main

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Ask what to update
echo ""
echo "What do you want to update?"
echo "  1) Backend only"
echo "  2) Frontend only"
echo "  3) Both (default)"
echo ""
read -p "Enter choice (1-3) [3]: " choice
choice=${choice:-3}

# Update backend
if [ "$choice" = "1" ] || [ "$choice" = "3" ]; then
    echo ""
    echo "🔄 Updating backend..."
    cd apps/bio-internal
    bun install
    cd ../..
    pm2 restart bio-backend
    echo "✅ Backend updated"
fi

# Update frontend
if [ "$choice" = "2" ] || [ "$choice" = "3" ]; then
    echo ""
    echo "🔄 Updating frontend..."
    cd apps/bio-dashboard
    bun install
    VITE_API_URL=${VITE_API_URL:-http://localhost:4100} bun run build
    cd ../..
    pm2 restart bio-frontend
    echo "✅ Frontend updated and rebuilt"
fi

echo ""
echo "✅ Update complete!"
echo ""
echo "📊 Current status:"
pm2 status

echo ""
echo "💡 View logs with: pm2 logs"
