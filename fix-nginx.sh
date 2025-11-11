#!/bin/bash
set -e

echo "🔧 Fixing Nginx Configuration"
echo "=============================="
echo ""

# Remove any existing config
sudo rm -f /etc/nginx/sites-enabled/bio-dashboard
sudo rm -f /etc/nginx/sites-available/bio-dashboard
sudo rm -f /etc/nginx/sites-enabled/default

echo "📝 Creating correct Nginx configuration..."

# Create the config file with proper syntax
sudo bash -c 'cat > /etc/nginx/sites-available/bio-dashboard << "ENDOFFILE"
server {
    listen 80;
    server_name biointernal.decentralabs.tech;

    # Backend API - all /api, /v1, /daos, /growth, /health routes
    location ~ ^/(api|v1|daos|growth|health|api-docs|swagger) {
        proxy_pass http://localhost:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend - everything else
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
ENDOFFILE'

# Enable the site
sudo ln -s /etc/nginx/sites-available/bio-dashboard /etc/nginx/sites-enabled/

echo ""
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

echo ""
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Nginx configuration fixed!"
echo ""
echo "Now run certbot:"
echo "  sudo certbot --nginx -d biointernal.decentralabs.tech"
