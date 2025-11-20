import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { healthRoutes } from './routes/health';
import { twitterRoutes } from './routes/twitter';
import { growthRoutes } from './routes/growth';
import { daoRoutes } from './routes/daos';
import { authRoutes, protectedAuthRoutes } from './routes/auth';
import { inviteRoutes } from './routes/invites';
import { discordRoutes } from './routes/discord';
import { apiKeyRoutes } from './routes/apiKeys';
import { rateLimit, securityHeaders, requestLogger } from './middleware/security';

const isDev = process.env.NODE_ENV !== 'production';

console.log(`🔧 Environment: ${isDev ? 'development' : 'production'}`);
console.log(`📂 Working directory: ${process.cwd()}`);

const dashboardDistPath = resolve(process.cwd(), '../bio-dashboard/dist');
const dashboardIndexPath = join(dashboardDistPath, 'index.html');
const hasDashboardBuild = existsSync(dashboardIndexPath);

console.log(`📦 Dashboard dist present: ${hasDashboardBuild ? 'yes' : 'no'}`);
console.log(`📁 Dashboard dist path: ${dashboardDistPath}`);

const apiPrefixes = ['/api', '/v1', '/daos', '/growth', '/health', '/auth', '/invites', '/api-docs', '/swagger'];

const shouldServeDashboard = (pathname: string) => {
  return !apiPrefixes.some((prefix) => pathname.startsWith(prefix));
};

const app = new Elysia()
  // 🔒 Security: Add security headers
  .use(securityHeaders())
  // 📊 Logging: Log all requests for audit
  .use(requestLogger())
  // 🚦 Rate limiting: Prevent abuse (1000 req/15min)
  .use(rateLimit())
  // Enable CORS for frontend
  .use(cors({
    origin: isDev
      ? ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173']
      : (origin) => {
          // In production, only allow specific origins
          const allowedOrigins = [
            process.env.FRONTEND_URL,
            process.env.DASHBOARD_URL,
          ].filter(Boolean);
          return allowedOrigins.length > 0 ? allowedOrigins.includes((origin as unknown as string) || '') : true;
        },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    maxAge: 86400, // 24 hours
  }))
  .use(
    swagger({
      path: '/api-docs',
      exclude: [
        /^\/api\/discord/,
        /^\/daos/,
        /^\/api\/growth/,
        /^\/api\/keys/,
        /^\/auth/,
        /^\/invites/,
        /^\/v1\/twitter\/ingest/,
        /^\/v1\/twitter\/engagement/,
        /^\/v1\/twitter\/followers/,
        /^\/v1\/twitter\/posts$/,
        /^\/v1\/twitter\/sync$/,
        /^\/health/,
        /^\/api$/,
      ],
      documentation: {
        info: {
          title: 'BioProtocol Dashboard API',
          version: '1.0.0',
          description: `
# BioProtocol Dashboard API

Internal API for accessing Twitter data by handle.

## Authentication

All endpoints require an API key:

\`\`\`
X-API-Key: bio_live_xxxxx
\`\`\`

**How to get an API key:**
Generate one from the dashboard (admin users only).

## Rate Limits

- **Limit:** 1000 requests per 15 minutes per API key
- **Response:** HTTP 429 with Retry-After header when limit exceeded

## Available Endpoints

### 1. Get Tweets by Handle
\`GET /v1/twitter/handle/:handle/tweets\`

Fetch recent tweets for a specific Twitter handle.

**Example:**
\`\`\`bash
curl -H "X-API-Key: bio_live_xxxxx" \\
  "https://bio-internal-api.bioagents.dev/v1/twitter/handle/BioProtocol/tweets?limit=25"
\`\`\`

### 2. Get Engagement Metrics
\`GET /v1/twitter/handle/:handle/engagement\`

Fetch engagement history (likes, retweets, replies, views) for a Twitter handle.

**Example:**
\`\`\`bash
curl -H "X-API-Key: bio_live_xxxxx" \\
  "https://bio-internal-api.bioagents.dev/v1/twitter/handle/BioProtocol/engagement?days=30"
\`\`\`

### 3. Get Follower History
\`GET /v1/twitter/handle/:handle/followers\`

Fetch follower count history for a Twitter handle.

**Example:**
\`\`\`bash
curl -H "X-API-Key: bio_live_xxxxx" \\
  "https://bio-internal-api.bioagents.dev/v1/twitter/handle/BioProtocol/followers?days=30"
\`\`\`

## Base URLs

- **Development:** http://localhost:4100
- **Production:** https://bio-internal-api.bioagents.dev

## Support

For technical support, contact: emre@bio.xyz

## Response Format

All endpoints return JSON with the following structure:

**Success:**
\`\`\`json
{
  "success": true,
  "data": { ... }
}
\`\`\`

**Error:**
\`\`\`json
{
  "success": false,
  "error": "Error message"
}
\`\`\`
          `,
          contact: {
            name: 'BioProtocol Dashboard Support',
            email: 'emre@bio.xyz',
          },
        },
        tags: [
          {
            name: 'Twitter',
            description: 'Twitter data access by handle - tweets, engagement, and follower metrics',
          },
        ],
        components: {
          securitySchemes: {
            ApiKeyAuth: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key',
              description: 'API key for authentication (format: bio_live_xxxxx). Contact admin@bio.xyz to obtain an API key.',
            },
          },
        },
        security: [
          { ApiKeyAuth: [] },
        ],
      },
    }),
  )
  // API routes (under /v1 or other prefixes)
  .get('/api', () => ({
    name: 'bio-internal',
    status: 'ok',
    environment: isDev ? 'development' : 'production',
  }))
  .use(healthRoutes)
  .use(authRoutes)
  .use(protectedAuthRoutes)
  .use(inviteRoutes)
  .use(apiKeyRoutes) // 🔑 API key management
  .use(twitterRoutes)
  .use(growthRoutes)
  .use(daoRoutes)
  .use(discordRoutes);

// Only serve static frontend if explicitly enabled (for monolithic deployment)
const serveFrontend = process.env.SERVE_FRONTEND === 'true';

if (!isDev && serveFrontend && hasDashboardBuild) {
  console.log('📦 Serving frontend from backend (monolithic mode)');
  app.use(await staticPlugin({
    assets: dashboardDistPath,
    prefix: '/',
    alwaysStatic: true,
    indexHTML: true,
    silent: true,
  }));

  app.onError(({ code, request, error }) => {
    if (code === 'NOT_FOUND' && request?.method === 'GET') {
      const pathname = new URL(request.url).pathname;
      if (shouldServeDashboard(pathname)) {
        return Bun.file(dashboardIndexPath);
      }
    }

    if (error) {
      return new Response((error as Error).message, {
        status: code === 'NOT_FOUND' ? 404 : 500,
      });
    }

    return new Response('Internal Server Error', { status: 500 });
  });
} else {
  console.log('🔌 API-only mode (frontend served separately)');
}

console.log('✅ API server configured - ready to handle requests');

export { app };
export type App = typeof app;
