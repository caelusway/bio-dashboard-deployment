#!/bin/bash
set -e

echo "🌐 Nginx Setup for Bio Dashboard"
echo "================================="
echo ""

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
read -p "Enter your domain name (e.g., example.com): " DOMAIN
read -p "Enter your API subdomain (e.g., api.example.com): " API_DOMAIN

echo ""
echo "📝 Creating Nginx configuration..."

# Create nginx config
sudo tee /etc/nginx/sites-available/bio-dashboard > /dev/null << EOF
# Frontend
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name $API_DOMAIN;

    location / {
        proxy_pass http://localhost:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

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

echo ""
echo "✅ Nginx configured successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Point your DNS records to this server:"
echo "   $DOMAIN -> $(curl -s ifconfig.me)"
echo "   $API_DOMAIN -> $(curl -s ifconfig.me)"
echo ""
echo "2. Update VITE_API_URL in .env:"
echo "   VITE_API_URL=http://$API_DOMAIN"
echo ""
echo "3. Rebuild frontend with new API URL:"
echo "   ./update.sh"
echo ""
echo "4. (Optional) Setup SSL with certbot:"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d $DOMAIN -d $API_DOMAIN"
echo ""
echo "🌐 Your site should now be accessible at:"
echo "   Frontend: http://$DOMAIN"
echo "   Backend:  http://$API_DOMAIN"
