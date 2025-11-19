# BioProtocol Dashboard Deployment

Production-ready monorepo for BioProtocol's dashboard frontend and internal API backend, fully Dockerized for easy deployment.

## 🚀 Quick Start

### Prerequisites
- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Bun](https://bun.sh) (for local non-Docker development)
- [Node.js 18+](https://nodejs.org/) (for local non-Docker development)

### Local Development with Docker

```bash
# Clone the repository
git clone https://github.com/your-org/bio-dashboard-deployment.git
cd bio-dashboard-deployment

# Set up environment variables
cp apps/bio-internal/.env.example apps/bio-internal/.env
# Edit .env with your configuration

# Start both services
npm run dev

# Access the applications
# Frontend: http://localhost:3000
# Backend:  http://localhost:4100
```

### Local Development without Docker

```bash
# Frontend
npm run dev:frontend

# Backend 
npm run dev:backend
```

## 📁 Project Structure

```
bio-dashboard-deployment/
├── apps/
│   ├── bio-dashboard/       # Frontend (Vite + React)
│   │   ├── src/             # Source code
│   │   ├── Dockerfile       # Frontend Docker config
│   │   └── package.json
│   └── bio-internal/        # Backend API (Bun + Elysia)
│       ├── src/             # Source code
│       │   ├── jobs/        # Twitter sync jobs
│       │   ├── routes/      # API routes
│       │   └── services/    # Twitter services
│       ├── scripts/         # Migration & utility scripts
│       ├── Dockerfile       # Backend Docker config
│       └── package.json
├── docs/                    # Documentation
│   ├── deployment/          # Deployment guides
│   ├── setup/               # Setup guides
│   └── README.md            # Documentation index
├── archive/                 # Archived legacy code
├── docker-compose.yml       # Local development
├── docker-compose.prod.yml  # Production deployment
└── package.json             # Root workspace config
```

## 🐳 Docker Commands

```bash
# Development
npm run dev              # Start all services (dev mode)
npm run build            # Build Docker images
npm run down             # Stop all services
npm run logs             # View logs from all services
npm run logs:frontend    # View frontend logs only
npm run logs:backend     # View backend logs only

# Production
npm run build:prod       # Build production images
npm run up:prod          # Start production services
npm run down:prod        # Stop production services

# Utilities
npm run ps               # List running containers
npm run restart          # Restart all services
npm run clean            # Remove containers, volumes, and node_modules
```

## ⚙️ Configuration

See [docs/setup/environment.md](./docs/setup/environment.md) for all environment variables.

### Key Environment Variables

**Backend (apps/bio-internal/.env):**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_DB_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
TWITTER_BEARER_TOKEN=...
ENABLE_AUTO_TWITTER_SYNC=true
```

**Frontend:**
```bash
VITE_API_URL=http://localhost:4100
```

## 🔄 Twitter Sync

The backend includes automated Twitter follower and engagement tracking:

```bash
# Run follower sync
npm run sync:followers

# Run engagement sync  
npm run sync:engagement

# Run both
npm run sync:full
```

Auto-sync runs every 2 hours when `ENABLE_AUTO_TWITTER_SYNC=true`.

## 📚 Documentation

- [Quick Start Guide](./docs/setup/quickstart.md)
- [Environment Variables](./docs/setup/environment.md)
- [Docker Deployment](./docs/deployment/docker.md)
- [Railway Deployment](./docs/deployment/railway.md)
- [Authentication Setup](./docs/setup/auth.md)
- [All Documentation](./docs/README.md)

## 🚢 Deployment

### Docker (Recommended)

```bash
# Build production images
npm run build:prod

# Deploy to production
npm run up:prod
```

### Platform-Specific Guides

- **Railway**: See [docs/deployment/railway.md](./docs/deployment/railway.md)
- **Coolify**: See [docs/deployment/coolify.md](./docs/deployment/coolify.md)
- **PM2**: See [docs/deployment/pm2.md](./docs/deployment/pm2.md)

## 🏗️ Development

```bash
# Install dependencies (in each app)
cd apps/bio-dashboard && bun install
cd apps/bio-internal && bun install

# Run locally without Docker
npm run dev:frontend  # http://localhost:3000
npm run dev:backend   # http://localhost:4100
```

## 📝 Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in dev mode |
| `npm run build` | Build Docker images |
| `npm run up:prod` | Deploy to production |
| `npm run logs` | View all logs |
| `npm run down` | Stop all services |
| `npm run clean` | Clean everything |

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test with `npm run dev`
4. Submit a pull request

## 📄 License

This project is proprietary and confidential.
