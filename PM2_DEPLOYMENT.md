# PM2 Deployment Guide

Simple deployment using PM2 process manager with Bun.

## Prerequisites

- A server (Ubuntu, Debian, or any Linux)
- SSH access to the server
- Git installed

## Quick Start

### 1. Clone the repository on your server

```bash
git clone https://github.com/your-username/bio-dashboard-deployment.git
cd bio-dashboard-deployment
```

### 2. Run the setup script

```bash
chmod +x setup-pm2.sh
./setup-pm2.sh
```

The script will:
- ✅ Install Bun (if not installed)
- ✅ Install PM2 (if not installed)
- ✅ Install all dependencies
- ✅ Create `.env` from `.env.example` (if needed)
- ✅ Build the frontend
- ✅ Start both services with PM2
- ✅ Configure PM2 for auto-start on reboot

### 3. Edit environment variables

If this is your first time, the script will create a `.env` file. Edit it:

```bash
nano .env
```

Required variables:
```env
NODE_ENV=production
PORT=4100

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Twitter
TWITTER_BEARER_TOKEN=your-twitter-token

# Frontend API URL (use your server's public IP or domain)
VITE_API_URL=http://your-server-ip:4100
# OR if using a domain:
# VITE_API_URL=https://api.yourdomain.com
```

After editing, run the script again:
```bash
./setup-pm2.sh
```

## PM2 Commands

### View logs
```bash
pm2 logs              # All logs
pm2 logs bio-backend  # Backend only
pm2 logs bio-frontend # Frontend only
pm2 logs --lines 100  # Last 100 lines
```

### Manage services
```bash
pm2 status            # Show status
pm2 restart all       # Restart all
pm2 restart bio-backend   # Restart backend only
pm2 stop all          # Stop all
pm2 start all         # Start all
pm2 delete all        # Remove all services
```

### Monitor resources
```bash
pm2 monit             # Real-time monitoring
```

### Save configuration
```bash
pm2 save              # Save current process list
```

## Accessing Your Application

- **Frontend:** `http://your-server-ip:3000`
- **Backend API:** `http://your-server-ip:4100`
- **API Docs:** `http://your-server-ip:4100/api-docs`

## Setting up with Nginx (Optional)

If you want to use a domain name and HTTPS:

### 1. Install Nginx
```bash
sudo apt update
sudo apt install nginx
```

### 2. Configure Nginx

Create config file:
```bash
sudo nano /etc/nginx/sites-available/bio-dashboard
```

Add this configuration:
```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # CORS headers (if needed)
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/bio-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Setup SSL with Certbot
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

### 4. Update VITE_API_URL

Edit `.env`:
```bash
VITE_API_URL=https://api.yourdomain.com
```

Rebuild and restart:
```bash
./setup-pm2.sh
```

## Updating Your Application

```bash
# Pull latest changes
git pull origin main

# Run setup script to rebuild and restart
./setup-pm2.sh
```

## Troubleshooting

### Services not starting?
```bash
pm2 logs bio-backend --lines 50
pm2 logs bio-frontend --lines 50
```

### Frontend showing localhost:4100 errors?
- Check that `VITE_API_URL` is set correctly in `.env`
- Rebuild frontend: `./setup-pm2.sh`

### Backend CORS errors?
- Backend already allows all origins (`origin: true` in CORS config)
- Check that backend is accessible from frontend domain

### Check if ports are in use
```bash
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :4100
```

### Firewall issues?
```bash
# Allow ports
sudo ufw allow 3000
sudo ufw allow 4100

# Or if using nginx
sudo ufw allow 'Nginx Full'
```

## Architecture

```
┌─────────────────────────────────────┐
│         PM2 Process Manager         │
├─────────────────┬───────────────────┤
│  bio-frontend   │   bio-backend     │
│  (Bun server)   │   (Elysia API)    │
│  Port 3000      │   Port 4100       │
└─────────────────┴───────────────────┘
```

## Auto-start on Server Reboot

The setup script configures PM2 to start automatically. If you need to set it up manually:

```bash
pm2 startup
# Copy and run the command it shows
pm2 save
```

## Coolify Alternative

If you prefer using Coolify, see [COOLIFY_SETUP.md](./COOLIFY_SETUP.md) instead.
