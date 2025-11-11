#!/bin/bash
set -e

echo "🌐 Nginx Setup for Bio Dashboard"
echo "================================="
echo ""

DOMAIN="biointernal.decentralabs.tech"

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
    echo "✅ Nginx installed"
else
    echo "✅ Nginx already installed"
fi

echo ""
echo "📝 Creating Nginx configuration for $DOMAIN..."

# Create nginx config - frontend and backend on same domain, different paths
sudo tee /etc/nginx/sites-available/bio-dashboard > /dev/null << 'EOF'
server {
    listen 80;
    server_name biointernal.decentralabs.tech;

    # Backend API - all /api, /v1, /daos, /growth, /health routes
    location ~ ^/(api|v1|daos|growth|health|api-docs|swagger) {
        proxy_pass http://localhost:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
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
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Remove default nginx site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable the site
sudo ln -sf /etc/nginx/sites-available/bio-dashboard /etc/nginx/sites-enabled/

# Test nginx config
echo ""
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

# Restart nginx
echo ""
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "✅ Nginx configured successfully!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Your DNS is already pointing to this server ✅"
echo ""
echo "2. Update VITE_API_URL in .env to use same domain:"
echo "   echo 'VITE_API_URL=https://$DOMAIN' >> .env"
echo ""
echo "3. Rebuild frontend with new API URL:"
echo "   cd apps/bio-dashboard"
echo "   VITE_API_URL=https://$DOMAIN bun run build"
echo "   cd ../.."
echo "   pm2 restart bio-frontend"
echo ""
echo "4. Setup SSL with certbot:"
echo "   sudo apt install -y certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d $DOMAIN"
echo ""
echo "🌐 Your site is now accessible at:"
echo "   http://$DOMAIN (will redirect to https after SSL setup)"
echo ""
echo "📡 API endpoints will be at:"
echo "   https://$DOMAIN/api/*"
echo "   https://$DOMAIN/daos/*"
echo "   https://$DOMAIN/growth/*"
