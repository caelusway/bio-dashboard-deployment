#!/bin/bash
set -e

echo "🚀 Bio Dashboard PM2 Deployment Script"
echo "========================================"
echo ""

# Check for required system dependencies
echo "🔍 Checking system dependencies..."
MISSING_DEPS=()

if ! command -v unzip &> /dev/null; then
    MISSING_DEPS+=("unzip")
fi

if ! command -v curl &> /dev/null; then
    MISSING_DEPS+=("curl")
fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo "❌ Missing required dependencies: ${MISSING_DEPS[*]}"
    echo ""
    echo "Please install them first:"
    echo ""
    echo "  Ubuntu/Debian:"
    echo "    sudo apt update && sudo apt install -y unzip curl"
    echo ""
    echo "  macOS:"
    echo "    brew install unzip curl"
    echo ""
    echo "  RHEL/CentOS/Fedora:"
    echo "    sudo yum install -y unzip curl"
    echo ""
    exit 1
fi

echo "✅ System dependencies ok"
echo ""

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "📦 Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"

    # Try to source shell config
    if [ -f "$HOME/.bashrc" ]; then
        source "$HOME/.bashrc" 2>/dev/null || true
    elif [ -f "$HOME/.zshrc" ]; then
        source "$HOME/.zshrc" 2>/dev/null || true
    fi

    # Verify bun is now available
    if ! command -v bun &> /dev/null; then
        echo "⚠️  Bun installed but not in PATH. Manually adding..."
        export PATH="$HOME/.bun/bin:$PATH"
    fi

    echo "✅ Bun installed successfully"
else
    echo "✅ Bun already installed"
fi

echo ""

# Check if pm2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    bun install -g pm2
fi

echo "✅ Prerequisites installed"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd apps/bio-internal
bun install --frozen-lockfile
cd ../..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd apps/bio-dashboard
bun install --frozen-lockfile
cd ../..

echo "✅ Dependencies installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo ""
    echo "❗ IMPORTANT: Edit .env file with your actual values!"
    echo "   Required variables:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_DB_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - SUPABASE_JWT_SECRET"
    echo "   - TWITTER_BEARER_TOKEN"
    echo "   - VITE_API_URL (e.g., http://localhost:4100 or your server IP)"
    echo ""
    read -p "Press Enter after you've edited .env file, or Ctrl+C to exit..."
fi

# Load environment variables
set -a
source .env
set +a

# Build frontend with API URL
echo "🏗️  Building frontend with API URL: ${VITE_API_URL:-http://localhost:4100}"
cd apps/bio-dashboard
VITE_API_URL=${VITE_API_URL:-http://localhost:4100} bun run build
cd ../..

echo "✅ Frontend built successfully"
echo ""

# Stop existing PM2 processes if any
echo "🛑 Stopping existing PM2 processes..."
pm2 delete bio-backend 2>/dev/null || true
pm2 delete bio-frontend 2>/dev/null || true

echo "✅ Cleaned up old processes"
echo ""

# Create PM2 ecosystem file
echo "📝 Creating PM2 ecosystem config..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'bio-backend',
      cwd: './apps/bio-internal',
      script: 'bun',
      args: 'run src/index.ts',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 4100,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
        TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN,
        LOG_LEVEL: process.env.LOG_LEVEL || 'info'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'bio-frontend',
      cwd: './apps/bio-dashboard',
      script: 'bun',
      args: 'run server.ts',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF

# Create logs directory
mkdir -p logs

# Start services with PM2
echo "🚀 Starting services with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (for system reboot)
echo ""
echo "⚙️  Setting up PM2 startup (run the command shown below if prompted)..."
pm2 startup

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
pm2 status

echo ""
echo "📝 Useful PM2 Commands:"
echo "  pm2 logs              - View all logs"
echo "  pm2 logs bio-backend  - View backend logs"
echo "  pm2 logs bio-frontend - View frontend logs"
echo "  pm2 restart all       - Restart all services"
echo "  pm2 stop all          - Stop all services"
echo "  pm2 delete all        - Remove all services"
echo "  pm2 monit             - Monitor resources"
echo ""
echo "🌐 Your services should be running at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:4100"
echo "  Backend API Docs: http://localhost:4100/api-docs"
echo ""
echo "💡 To make PM2 start on system boot, run the command shown above (if any)"
