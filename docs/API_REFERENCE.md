# BioProtocol API Reference

Complete API reference for the BioProtocol Internal API.

## Base URL

- **Development:** `http://localhost:4100`
- **Production:** `https://your-api-domain.com`

## Authentication

All endpoints (except `/health`, `/auth/login`, `/auth/signup`) require authentication.

### Primary Method: API Key (Recommended for External Apps)

```http
X-API-Key: bio_live_xxxxx
```

**Example:**
```bash
curl -H "X-API-Key: bio_live_0FQhPsCVJ64oh5XJIEFGVqlymJvaW061lbXsLdFXyHc" \
  http://localhost:4100/v1/twitter/handle/molecule_dao/tweets
```

### Alternative Method: JWT Token (Dashboard Users Only)

```http
Authorization: Bearer <your-jwt-token>
```

**Note:** API Key authentication is the primary and recommended method for external applications.

## Rate Limits

- **Limit:** 1000 requests per 15 minutes
- **Identifier:** API key or IP address
- **Response on limit:** HTTP 429 with `Retry-After` header

---

## Endpoints

### Health

#### GET `/health`

Check API health status.

**Authentication:** None required

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-20T12:34:56.789Z"
}
```

---

### Authentication

#### POST `/auth/login`

User login with email and password.

**Authentication:** None required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "...",
    "expires_in": 3600
  },
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin",
    "fullName": "User Name"
  }
}
```

#### GET `/auth/me`

Get current user information.

**Authentication:** Required (JWT only)

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin",
    "fullName": "User Name"
  }
}
```

---

### API Keys (Admin Only)

#### GET `/api/keys`

List all API keys.

**Authentication:** Required (admin only)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Production App",
      "keyPrefix": "bio_live_0FQhPs",
      "createdBy": "uuid",
      "lastUsedAt": "2025-11-20T12:34:56.789Z",
      "expiresAt": null,
      "isActive": true,
      "createdAt": "2025-11-20T10:00:00.000Z",
      "updatedAt": "2025-11-20T10:00:00.000Z"
    }
  ]
}
```

#### POST `/api/keys`

Generate a new API key.

**Authentication:** Required (admin only)

**Request Body:**
```json
{
  "name": "Production App",
  "expiresInDays": 365
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Production App",
    "key": "bio_live_0FQhPsCVJ64oh5XJIEFGVqlymJvaW061lbXsLdFXyHc",
    "keyPrefix": "bio_live_0FQhPs",
    "createdBy": "uuid",
    "expiresAt": "2026-11-20T10:00:00.000Z",
    "isActive": true,
    "createdAt": "2025-11-20T10:00:00.000Z"
  },
  "warning": "⚠️ Save this key now! You will not be able to see it again."
}
```

#### PATCH `/api/keys/:id/revoke`

Revoke an API key.

**Authentication:** Required (admin only)

**Response:**
```json
{
  "success": true,
  "message": "API key revoked successfully",
  "data": {
    "id": "uuid",
    "isActive": false
  }
}
```

---

### Discord

#### GET `/api/discord/channels`

List all Discord channels with DAO information.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "channelId": "1234567890",
      "name": "general",
      "type": "text",
      "category": "Community",
      "categoryId": "9876543210",
      "lastSyncedAt": "2025-11-20T12:00:00.000Z",
      "daoId": "uuid",
      "daoName": "Molecule",
      "daoSlug": "molecule",
      "isForum": false
    }
  ]
}
```

#### GET `/api/discord/reports`

List AI-generated Discord reports with filtering.

**Authentication:** Required

**Query Parameters:**
- `channelId` (optional): Filter by channel ID
- `reportType` (optional): Filter by type (`weekly` or `monthly`)
- `daoId` (optional): Filter by DAO ID
- `limit` (optional): Number of results (default: 50)
- `hideEmpty` (optional): Hide reports with 0 messages (default: false)

**Example:**
```bash
GET /api/discord/reports?reportType=weekly&hideEmpty=true&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "channelId": "uuid",
      "reportType": "weekly",
      "periodStart": "2025-11-13T00:00:00.000Z",
      "periodEnd": "2025-11-20T00:00:00.000Z",
      "content": "## 📋 Executive Summary\n\n...",
      "summary": "Active week with 150 messages...",
      "status": "published",
      "metadata": {
        "stats": {
          "totalMessages": 150,
          "uniqueAuthors": 25,
          "averageMessagesPerDay": 21.4
        },
        "analysis": {
          "actionItemsPending": 5,
          "actionItemsCompleted": 3,
          "sentiment": "positive",
          "engagementLevel": "high"
        }
      },
      "createdAt": "2025-11-20T12:00:00.000Z",
      "channelName": "general",
      "channelCategory": "Community",
      "daoId": "uuid",
      "daoName": "Molecule",
      "daoSlug": "molecule"
    }
  ]
}
```

#### GET `/api/discord/reports/:id`

Get a specific report by ID.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "channelId": "uuid",
    "reportType": "weekly",
    "periodStart": "2025-11-13T00:00:00.000Z",
    "periodEnd": "2025-11-20T00:00:00.000Z",
    "content": "## 📋 Executive Summary\n\n...",
    "summary": "Active week with 150 messages...",
    "status": "published",
    "metadata": { /* ... */ },
    "createdAt": "2025-11-20T12:00:00.000Z",
    "channelName": "general",
    "channelCategory": "Community",
    "daoId": "uuid",
    "daoName": "Molecule",
    "daoSlug": "molecule"
  }
}
```

#### GET `/api/discord/stats`

Get Discord statistics overview.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "totalChannels": 45,
    "totalMessages": 12500,
    "totalReports": 180,
    "messagesByDao": [
      {
        "daoId": "uuid",
        "daoName": "Molecule",
        "daoSlug": "molecule",
        "messageCount": 5000
      }
    ],
    "latestSync": [
      {
        "channelName": "general",
        "lastSyncedAt": "2025-11-20T12:00:00.000Z"
      }
    ]
  }
}
```

---

### DAOs

#### GET `/daos`

List all DAOs with pagination and filtering.

**Authentication:** Required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50, max: 100)
- `sortBy` (optional): Sort field (`name`, `followers`, `createdAt`)
- `order` (optional): Sort order (`asc`, `desc`)

**Example:**
```bash
GET /daos?page=1&limit=20&sortBy=followers&order=desc
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "molecule",
      "name": "Molecule",
      "twitterHandle": "molecule_dao",
      "followerCount": 25000,
      "followerCountUpdatedAt": "2025-11-20T12:00:00.000Z",
      "lastSyncedAt": "2025-11-20T12:00:00.000Z",
      "metadata": {
        "twitterDisplayName": "Molecule",
        "description": "Decentralizing biopharma...",
        "logoUrl": "https://pbs.twimg.com/profile_images/..."
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### GET `/daos/:slug`

Get specific DAO details.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "molecule",
    "name": "Molecule",
    "twitterHandle": "molecule_dao",
    "followerCount": 25000,
    "followerCountUpdatedAt": "2025-11-20T12:00:00.000Z",
    "lastSyncedAt": "2025-11-20T12:00:00.000Z",
    "metadata": { /* ... */ },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET `/daos/:slug/followers`

Get follower history for a DAO.

**Authentication:** Required

**Query Parameters:**
- `days` (optional): Number of days of history (default: 30)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-20",
      "followerCount": 25000,
      "change": 150
    },
    {
      "date": "2025-11-19",
      "followerCount": 24850,
      "change": 120
    }
  ]
}
```

#### GET `/daos/:slug/posts`

Get Twitter posts for a DAO.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of posts (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tweetId": "1234567890",
      "author": {
        "id": "123456",
        "name": "Molecule",
        "username": "molecule_dao"
      },
      "content": "Exciting news! We're launching...",
      "tweetMetrics": {
        "retweet_count": 50,
        "reply_count": 25,
        "like_count": 300,
        "view_count": 10000
      },
      "hashtags": ["#DeSci", "#Biopharma"],
      "mentions": [],
      "media": [],
      "tweetedAt": "2025-11-20T10:00:00.000Z",
      "ingestedAt": "2025-11-20T10:05:00.000Z"
    }
  ]
}
```

---

### Twitter (Handle-Based Endpoints for External Clients)

#### GET `/v1/twitter/handle/:handle/tweets`

Get tweets by Twitter handle.

**Authentication:** Required (API Key recommended)

**Path Parameters:**
- `handle` (required): Twitter handle without @ (e.g., `molecule_dao`)

**Query Parameters:**
- `limit` (optional): Number of tweets to return (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```bash
curl -H "X-API-Key: bio_live_xxxxx" \
  "http://localhost:4100/v1/twitter/handle/molecule_dao/tweets?limit=20"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "handle": "molecule_dao",
    "daoName": "Molecule",
    "tweets": [
      {
        "id": "uuid",
        "tweetId": "1234567890",
        "author": {
          "id": "123456",
          "name": "Molecule",
          "username": "molecule_dao"
        },
        "content": "Exciting announcement!",
        "tweetMetrics": {
          "retweet_count": 50,
          "reply_count": 25,
          "like_count": 300,
          "view_count": 10000
        },
        "hashtags": ["#DeSci"],
        "mentions": [],
        "media": [],
        "tweetedAt": "2025-11-20T10:00:00.000Z",
        "ingestedAt": "2025-11-20T10:05:00.000Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "count": 20
    }
  }
}
```

#### GET `/v1/twitter/handle/:handle/engagement`

Get engagement metrics by Twitter handle.

**Authentication:** Required (API Key recommended)

**Path Parameters:**
- `handle` (required): Twitter handle without @ (e.g., `molecule_dao`)

**Query Parameters:**
- `days` (optional): Number of days of history (default: 30)

**Example:**
```bash
curl -H "X-API-Key: bio_live_xxxxx" \
  "http://localhost:4100/v1/twitter/handle/molecule_dao/engagement?days=7"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "handle": "molecule_dao",
    "daoName": "Molecule",
    "engagement": [
      {
        "date": "2025-11-20",
        "likes": 500,
        "retweets": 100,
        "replies": 50,
        "views": 10000
      }
    ]
  }
}
```

#### GET `/v1/twitter/handle/:handle/followers`

Get follower history by Twitter handle.

**Authentication:** Required (API Key recommended)

**Path Parameters:**
- `handle` (required): Twitter handle without @ (e.g., `molecule_dao`)

**Query Parameters:**
- `days` (optional): Number of days of history (default: 30)

**Example:**
```bash
curl -H "X-API-Key: bio_live_xxxxx" \
  "http://localhost:4100/v1/twitter/handle/molecule_dao/followers?days=7"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "handle": "molecule_dao",
    "daoName": "Molecule",
    "followers": [
      {
        "date": "2025-11-20",
        "followerCount": 25000,
        "change": 150
      }
    ]
  }
}
```

---

### Twitter (Internal Endpoints)

#### POST `/v1/twitter/ingest`

Ingest Twitter posts data.

**Authentication:** Required

**Request Body:**
```json
{
  "orgId": "uuid",
  "daoId": "uuid",
  "posts": [
    {
      "tweetId": "1234567890",
      "author": {
        "id": "123456",
        "name": "Molecule",
        "username": "molecule_dao"
      },
      "content": "Tweet content...",
      "tweetMetrics": {
        "retweet_count": 10,
        "reply_count": 5,
        "like_count": 50
      },
      "tweetedAt": "2025-11-20T10:00:00.000Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "inserted": 1,
  "updated": 0
}
```

#### GET `/v1/twitter/engagement/:daoId`

Get engagement history for a DAO by internal DAO ID.

**Authentication:** Required

**Path Parameters:**
- `daoId` (required): Internal DAO UUID

**Query Parameters:**
- `days` (optional): Number of days (default: 30)

**Note:** For external clients, use `/v1/twitter/handle/:handle/engagement` instead.

#### GET `/v1/twitter/followers/:daoId`

Get follower history for a DAO by internal DAO ID.

**Authentication:** Required

**Path Parameters:**
- `daoId` (required): Internal DAO UUID

**Query Parameters:**
- `days` (optional): Number of days (default: 30)

**Note:** For external clients, use `/v1/twitter/handle/:handle/followers` instead.

---

### Growth

#### GET `/api/growth/sources`

Get growth source summaries.

**Authentication:** Required

**Query Parameters:**
- `window` (optional): Time window (`day`, `week`, `month`)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Twitter",
      "platform": "twitter",
      "currentValue": 25000,
      "previousValue": 24850,
      "change": 150,
      "changePercent": 0.6,
      "lastUpdated": "2025-11-20T12:00:00.000Z"
    }
  ]
}
```

#### GET `/api/growth/history/:sourceId`

Get growth history for a specific source.

**Authentication:** Required

**Query Parameters:**
- `window` (optional): Time window (`day`, `week`, `month`)
- `limit` (optional): Number of data points (default: 30)

**Response:**
```json
{
  "data": [
    {
      "timestamp": "2025-11-20T00:00:00.000Z",
      "value": 25000,
      "change": 150,
      "changePercent": 0.6
    }
  ]
}
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Authentication required. Provide either Authorization header (Bearer token) or X-API-Key header."
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden: Admin access required"
}
```

### 404 Not Found

```json
{
  "error": "Resource not found"
}
```

### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

**Headers:**
```
Retry-After: 300
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

---

## Code Examples

### Node.js (fetch)

```javascript
const API_KEY = process.env.BIO_API_KEY;
const API_URL = 'http://localhost:4100';

async function getDiscordChannels() {
  const response = await fetch(`${API_URL}/api/discord/channels`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data;
}
```

### Python (requests)

```python
import os
import requests

API_KEY = os.getenv('BIO_API_KEY')
API_URL = 'http://localhost:4100'

def get_discord_reports():
    headers = {'X-API-Key': API_KEY}
    response = requests.get(
        f'{API_URL}/api/discord/reports',
        headers=headers,
        params={'reportType': 'weekly', 'hideEmpty': 'true'}
    )
    response.raise_for_status()
    return response.json()['data']
```

### cURL

```bash
# List Discord channels
curl -H "X-API-Key: bio_live_xxxxx" \
  http://localhost:4100/api/discord/channels

# Get weekly reports
curl -H "X-API-Key: bio_live_xxxxx" \
  "http://localhost:4100/api/discord/reports?reportType=weekly&hideEmpty=true"

# Get DAO details
curl -H "X-API-Key: bio_live_xxxxx" \
  http://localhost:4100/daos/molecule
```

---

## Interactive Documentation

Visit `/api-docs` for interactive Swagger UI documentation where you can test endpoints directly.

**URL:** http://localhost:4100/api-docs

---

## Support

For API keys, issues, or questions:
- **Email:** emre@bio.xyz
- **Documentation:** See `docs/API_KEYS_GUIDE.md`
- **Security:** See `docs/API_SECURITY.md`

