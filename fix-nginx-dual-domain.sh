#!/bin/bash
set -e

echo "🔧 Setting up Nginx for Dual Domain Configuration"
echo "================================================="
echo ""

# Remove any existing config
sudo rm -f /etc/nginx/sites-enabled/bio-dashboard
sudo rm -f /etc/nginx/sites-available/bio-dashboard
sudo rm -f /etc/nginx/sites-enabled/default

echo "📝 Creating Nginx configuration for both domains..."

# Create the config file with both domains
sudo bash -c 'cat > /etc/nginx/sites-available/bio-dashboard << "ENDOFFILE"
# Frontend on main domain
server {
    listen 80;
    server_name biointernal.decentralabs.tech;

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

# Backend API on subdomain
server {
    listen 80;
    server_name api.decentralabs.tech;

    location / {
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
echo "✅ Nginx configured for both domains!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Make sure DNS is pointing to this server:"
echo "   biointernal.decentralabs.tech -> $(curl -s ifconfig.me)"
echo "   api.decentralabs.tech -> $(curl -s ifconfig.me)"
echo ""
echo "2. Run certbot for both domains:"
echo "   sudo certbot --nginx -d biointernal.decentralabs.tech -d api.decentralabs.tech"
echo ""
echo "3. Update VITE_API_URL in .env:"
echo "   echo 'VITE_API_URL=https://api.decentralabs.tech' >> .env"
echo ""
echo "4. Rebuild frontend:"
echo "   cd apps/bio-dashboard"
echo "   VITE_API_URL=https://api.decentralabs.tech bun run build"
echo "   cd ../.."
echo "   pm2 restart bio-frontend"
echo ""
echo "🌐 Your services will be at:"
echo "   Frontend: https://biointernal.decentralabs.tech"
echo "   Backend:  https://api.decentralabs.tech"
