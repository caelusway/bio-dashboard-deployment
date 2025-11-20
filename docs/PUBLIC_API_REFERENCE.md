# BioProtocol Public API Reference

Public API documentation for external clients.

## Base URL

- **Production:** `https://bio-internal-api.bioagents.dev`
- **Development:** `http://localhost:4100`

## Authentication

🔒 **All endpoints require API key authentication.** Requests without authentication will receive a `401 Unauthorized` response.

### API Key Authentication

```http
X-API-Key: bio_live_xxxxx
```

**Example:**
```bash
curl -H "X-API-Key: your-api-key-here" \
  https://bio-internal-api.bioagents.dev/v1/twitter/handle/BioProtocol/tweets?limit=25
```

**To obtain an API key:** Contact your BioProtocol administrator.

## Rate Limits

- **Limit:** 1000 requests per 15 minutes per API key
- **Response on limit:** HTTP 429 with `Retry-After` header

---

## Endpoints

### Health Check

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

### Twitter Data

#### GET `/v1/twitter/handle/:handle/tweets`

Get tweets by Twitter handle.

**Authentication:** Required

**Path Parameters:**
- `handle` (required): Twitter handle without @ (e.g., `molecule_dao`)

**Query Parameters:**
- `limit` (optional): Number of tweets to return (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```bash
curl -H "X-API-Key: your-api-key-here" \
  "https://your-api-domain.com/v1/twitter/handle/molecule_dao/tweets?limit=20"
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
        "content": "Exciting announcement about our latest research!",
        "tweetMetrics": {
          "retweet_count": 50,
          "reply_count": 25,
          "like_count": 300,
          "view_count": 10000
        },
        "hashtags": ["DeSci", "Biopharma"],
        "mentions": [],
        "media": [
          {
            "type": "photo",
            "url": "https://pbs.twimg.com/media/..."
          }
        ],
        "conversationId": "1234567890",
        "inReplyToId": null,
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

**Authentication:** Required

**Path Parameters:**
- `handle` (required): Twitter handle without @ (e.g., `molecule_dao`)

**Query Parameters:**
- `days` (optional): Number of days of history (default: 30, max: 90)

**Example Request:**
```bash
curl -H "X-API-Key: your-api-key-here" \
  "https://your-api-domain.com/v1/twitter/handle/molecule_dao/engagement?days=7"
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
        "views": 10000,
        "bookmarks": 25
      },
      {
        "date": "2025-11-19",
        "likes": 480,
        "retweets": 95,
        "replies": 45,
        "views": 9500,
        "bookmarks": 22
      }
    ]
  }
}
```

#### GET `/v1/twitter/handle/:handle/followers`

Get follower history by Twitter handle.

**Authentication:** Required

**Path Parameters:**
- `handle` (required): Twitter handle without @ (e.g., `molecule_dao`)

**Query Parameters:**
- `days` (optional): Number of days of history (default: 30, max: 90)

**Example Request:**
```bash
curl -H "X-API-Key: your-api-key-here" \
  "https://your-api-domain.com/v1/twitter/handle/molecule_dao/followers?days=7"
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
      },
      {
        "date": "2025-11-19",
        "followerCount": 24850,
        "change": 120
      }
    ]
  }
}
```

---

## Error Responses

### 401 Unauthorized

Missing or invalid API key.

```json
{
  "error": "Authentication required. Provide X-API-Key header."
}
```

### 404 Not Found

Twitter handle not found in our system.

```json
{
  "success": false,
  "error": "Twitter handle @invalid_handle not found"
}
```

### 429 Too Many Requests

Rate limit exceeded.

```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

**Response Headers:**
```
Retry-After: 300
```

### 500 Internal Server Error

Server error occurred.

```json
{
  "success": false,
  "error": "Failed to fetch tweets"
}
```

---

## Code Examples

### Node.js (fetch)

```javascript
const API_KEY = process.env.BIO_API_KEY;
const API_URL = 'https://your-api-domain.com';

async function getTweets(handle, limit = 50) {
  const response = await fetch(
    `${API_URL}/v1/twitter/handle/${handle}/tweets?limit=${limit}`,
    {
      headers: {
        'X-API-Key': API_KEY,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data.tweets;
}

// Usage
getTweets('molecule_dao', 20)
  .then(tweets => console.log('Tweets:', tweets))
  .catch(error => console.error('Error:', error));
```

### Node.js (axios)

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://your-api-domain.com',
  headers: {
    'X-API-Key': process.env.BIO_API_KEY,
  },
});

async function getEngagement(handle, days = 7) {
  const response = await api.get(
    `/v1/twitter/handle/${handle}/engagement`,
    { params: { days } }
  );
  return response.data.data.engagement;
}

// Usage
getEngagement('molecule_dao', 7)
  .then(data => console.log('Engagement:', data))
  .catch(error => console.error('Error:', error));
```

### Python (requests)

```python
import os
import requests

API_KEY = os.getenv('BIO_API_KEY')
API_URL = 'https://your-api-domain.com'

def get_tweets(handle, limit=50):
    headers = {'X-API-Key': API_KEY}
    response = requests.get(
        f'{API_URL}/v1/twitter/handle/{handle}/tweets',
        headers=headers,
        params={'limit': limit}
    )
    response.raise_for_status()
    return response.json()['data']['tweets']

def get_followers(handle, days=30):
    headers = {'X-API-Key': API_KEY}
    response = requests.get(
        f'{API_URL}/v1/twitter/handle/{handle}/followers',
        headers=headers,
        params={'days': days}
    )
    response.raise_for_status()
    return response.json()['data']['followers']

# Usage
tweets = get_tweets('molecule_dao', limit=20)
print(f'Found {len(tweets)} tweets')

followers = get_followers('molecule_dao', days=7)
print(f'Follower history: {len(followers)} days')
```

### Python (httpx - async)

```python
import os
import httpx
import asyncio

API_KEY = os.getenv('BIO_API_KEY')
API_URL = 'https://your-api-domain.com'

async def get_tweets(handle, limit=50):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f'{API_URL}/v1/twitter/handle/{handle}/tweets',
            headers={'X-API-Key': API_KEY},
            params={'limit': limit}
        )
        response.raise_for_status()
        return response.json()['data']['tweets']

async def get_engagement(handle, days=30):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f'{API_URL}/v1/twitter/handle/{handle}/engagement',
            headers={'X-API-Key': API_KEY},
            params={'days': days}
        )
        response.raise_for_status()
        return response.json()['data']['engagement']

# Usage
async def main():
    tweets = await get_tweets('molecule_dao', limit=20)
    engagement = await get_engagement('molecule_dao', days=7)
    print(f'Tweets: {len(tweets)}, Engagement days: {len(engagement)}')

asyncio.run(main())
```

### Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
)

type TweetResponse struct {
    Success bool `json:"success"`
    Data    struct {
        Handle  string `json:"handle"`
        DaoName string `json:"daoName"`
        Tweets  []struct {
            TweetID      string `json:"tweetId"`
            Content      string `json:"content"`
            TweetMetrics struct {
                RetweetCount int `json:"retweet_count"`
                LikeCount    int `json:"like_count"`
            } `json:"tweetMetrics"`
            TweetedAt string `json:"tweetedAt"`
        } `json:"tweets"`
    } `json:"data"`
}

func getTweets(handle string, limit int) (*TweetResponse, error) {
    apiKey := os.Getenv("BIO_API_KEY")
    apiURL := fmt.Sprintf("https://your-api-domain.com/v1/twitter/handle/%s/tweets?limit=%d", handle, limit)
    
    req, err := http.NewRequest("GET", apiURL, nil)
    if err != nil {
        return nil, err
    }
    
    req.Header.Set("X-API-Key", apiKey)
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }
    
    var result TweetResponse
    err = json.Unmarshal(body, &result)
    return &result, err
}

func main() {
    tweets, err := getTweets("molecule_dao", 20)
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    
    fmt.Printf("Found %d tweets for %s\n", len(tweets.Data.Tweets), tweets.Data.Handle)
}
```

### cURL

```bash
# Get tweets
curl -H "X-API-Key: your-api-key-here" \
  "https://your-api-domain.com/v1/twitter/handle/molecule_dao/tweets?limit=20"

# Get engagement
curl -H "X-API-Key: your-api-key-here" \
  "https://your-api-domain.com/v1/twitter/handle/molecule_dao/engagement?days=7"

# Get followers
curl -H "X-API-Key: your-api-key-here" \
  "https://your-api-domain.com/v1/twitter/handle/molecule_dao/followers?days=30"

# With jq for pretty output
curl -H "X-API-Key: your-api-key-here" \
  "https://your-api-domain.com/v1/twitter/handle/molecule_dao/tweets?limit=5" | jq
```

---

## Best Practices

### 1. Secure API Key Storage

**❌ Don't:**
```javascript
const API_KEY = 'bio_live_xxxxx'; // Hardcoded
```

**✅ Do:**
```javascript
const API_KEY = process.env.BIO_API_KEY; // Environment variable
```

### 2. Error Handling

Always implement proper error handling:

```javascript
async function fetchWithErrorHandling(url) {
  try {
    const response = await fetch(url, {
      headers: { 'X-API-Key': API_KEY },
    });
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      console.log(`Rate limited. Retry after ${retryAfter} seconds`);
      // Implement exponential backoff
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### 3. Rate Limit Handling

Implement exponential backoff:

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: { 'X-API-Key': API_KEY },
      });
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### 4. Caching

Cache responses to reduce API calls:

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetch(url, {
    headers: { 'X-API-Key': API_KEY },
  }).then(r => r.json());
  
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}
```

### 5. Pagination

Handle pagination for large datasets:

```javascript
async function getAllTweets(handle, maxTweets = 1000) {
  const tweets = [];
  const limit = 100; // Max per request
  let offset = 0;
  
  while (tweets.length < maxTweets) {
    const response = await fetch(
      `${API_URL}/v1/twitter/handle/${handle}/tweets?limit=${limit}&offset=${offset}`,
      { headers: { 'X-API-Key': API_KEY } }
    );
    
    const data = await response.json();
    const batch = data.data.tweets;
    
    if (batch.length === 0) break;
    
    tweets.push(...batch);
    offset += limit;
    
    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return tweets.slice(0, maxTweets);
}
```

---

## Available Twitter Handles

Contact your administrator for a list of available Twitter handles you can query.

---

## Support

For API keys, issues, or questions:
- **Email:** Contact your BioProtocol administrator
- **Rate Limit Increase:** Contact support if you need higher limits

---

## Changelog

- **2025-11-20:** Initial public API release
  - Twitter handle-based endpoints
  - Rate limit: 1000 requests per 15 minutes
  - API key authentication

