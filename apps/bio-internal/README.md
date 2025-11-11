# bio-internal API

Internal API service for BioProtocol built with Bun and Elysia.

## Development

```bash
bun install
bun run dev
```

Server runs on http://localhost:4100

## Production Build (with Dashboard)

The production deployment serves both the API and the dashboard:

```bash
# Build dashboard
cd ../bio-dashboard
bun install && bun run build

# Start API (serves both API and dashboard)
cd ../bio-internal
NODE_ENV=production bun run src/index.ts
```

Visit http://localhost:4100 to see the dashboard.

## API Routes

- `GET /api` - API status
- `GET /health` - Health check
- `GET /v1/*` - Twitter API routes
- `GET /daos/*` - DAO stats routes
- `GET /growth/*` - Growth metrics routes
- `GET /api-docs` - Swagger documentation

## Environment Variables

```bash
NODE_ENV=production        # Enables static file serving
PORT=4100                  # Server port
SUPABASE_URL=              # Supabase project URL
SUPABASE_SERVICE_KEY=      # Supabase service role key
SUPABASE_DB_URL=           # Direct database connection
```
