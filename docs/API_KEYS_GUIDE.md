# API Keys Guide for External Applications

## Overview

This guide explains how to obtain and use API keys to access the bio-internal API from external applications.

## Getting an API Key

### Prerequisites

- You must have an **administrator** contact you to generate an API key
- Provide a **descriptive name** for your application (e.g., "Analytics Dashboard", "Data Pipeline")
- Specify if you need an **expiration date** (optional)

### Request Process

1. Contact your Bio administrator
2. Provide application details and use case
3. Administrator generates the key via the admin dashboard
4. You receive the API key **once** - save it immediately!

**⚠️ Important:** The full API key is shown only once at creation. If you lose it, you'll need to generate a new one.

## API Key Format

API keys follow this format:

```
bio_live_<43-character-random-string>
```

Example:
```
bio_live_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789ABCDEFG
```

## Using Your API Key

### Basic Usage

Include the API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: bio_live_xxxxx" \
  https://api.yourdomain.com/api/discord/channels
```

### Code Examples

#### Node.js (fetch)

```javascript
const API_KEY = process.env.BIO_API_KEY;
const API_URL = 'https://api.yourdomain.com';

async function fetchDiscordChannels() {
  const response = await fetch(`${API_URL}/api/discord/channels`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}
```

#### Node.js (axios)

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.yourdomain.com',
  headers: {
    'X-API-Key': process.env.BIO_API_KEY,
  },
});

async function getDAOs() {
  const response = await api.get('/daos');
  return response.data;
}
```

#### Python (requests)

```python
import os
import requests

API_KEY = os.getenv('BIO_API_KEY')
API_URL = 'https://api.yourdomain.com'

def fetch_discord_reports():
    headers = {'X-API-Key': API_KEY}
    response = requests.get(f'{API_URL}/api/discord/reports', headers=headers)
    response.raise_for_status()
    return response.json()
```

#### Python (httpx - async)

```python
import os
import httpx

API_KEY = os.getenv('BIO_API_KEY')
API_URL = 'https://api.yourdomain.com'

async def fetch_daos():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f'{API_URL}/daos',
            headers={'X-API-Key': API_KEY}
        )
        response.raise_for_status()
        return response.json()
```

#### Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
)

func fetchDiscordChannels() (map[string]interface{}, error) {
    apiKey := os.Getenv("BIO_API_KEY")
    apiURL := "https://api.yourdomain.com/api/discord/channels"
    
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
    
    var result map[string]interface{}
    err = json.Unmarshal(body, &result)
    return result, err
}
```

## Available Endpoints

### Discord

- `GET /api/discord/channels` - List all Discord channels
- `GET /api/discord/reports` - List AI-generated reports
- `GET /api/discord/reports/:id` - Get specific report
- `GET /api/discord/stats` - Get Discord statistics

### DAOs

- `GET /daos` - List all DAOs with pagination
- `GET /daos/:slug` - Get specific DAO details
- `GET /daos/:slug/followers` - Get follower history
- `GET /daos/:slug/posts` - Get Twitter posts

### Twitter

- `POST /v1/twitter/ingest` - Ingest Twitter data
- `GET /v1/twitter/engagement/:daoId` - Get engagement history
- `GET /v1/twitter/followers/:daoId` - Get follower history

### Growth

- `GET /api/growth/sources` - Get growth source summaries
- `GET /api/growth/history/:sourceId` - Get growth history

## Rate Limits

- **Limit:** 1000 requests per 15 minutes
- **Identifier:** Your API key
- **Response:** HTTP 429 with `Retry-After` header

### Handling Rate Limits

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded');
}
```

## Error Handling

### Common Errors

#### 401 Unauthorized

**Cause:** Invalid or missing API key

**Solution:**
```javascript
if (response.status === 401) {
  console.error('Invalid API key. Please check your credentials.');
  // Log error, alert admin, etc.
}
```

#### 429 Too Many Requests

**Cause:** Rate limit exceeded

**Solution:**
```javascript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.log(`Rate limited. Retry after ${retryAfter} seconds.`);
  // Implement exponential backoff
}
```

#### 500 Internal Server Error

**Cause:** Server-side error

**Solution:**
```javascript
if (response.status === 500) {
  console.error('Server error. Please contact support.');
  // Implement retry with exponential backoff
}
```

## Best Practices

### 1. Secure Storage

**❌ Don't:**
```javascript
// Hardcoded in code
const API_KEY = 'bio_live_xxxxx';
```

**✅ Do:**
```javascript
// Environment variable
const API_KEY = process.env.BIO_API_KEY;
```

### 2. Error Handling

Always implement proper error handling:

```javascript
try {
  const data = await fetchData();
  // Process data
} catch (error) {
  console.error('API error:', error);
  // Log to monitoring service
  // Retry with backoff
  // Alert on repeated failures
}
```

### 3. Caching

Cache responses to reduce API calls:

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchData(url);
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}
```

### 4. Logging

Log API requests for debugging:

```javascript
function logRequest(method, url, status) {
  console.log(`[${new Date().toISOString()}] ${method} ${url} - ${status}`);
}
```

### 5. Monitoring

Monitor API key usage:
- Track request counts
- Monitor error rates
- Set up alerts for failures
- Review usage patterns

## Security

### Do's

✅ Store API keys in environment variables  
✅ Use HTTPS for all requests  
✅ Rotate keys periodically  
✅ Monitor key usage  
✅ Revoke unused keys  

### Don'ts

❌ Commit keys to version control  
❌ Share keys between applications  
❌ Log full API keys  
❌ Use keys in client-side code  
❌ Store keys in plain text files  

## Troubleshooting

### "Invalid API key" Error

1. Verify the key is correct (check for typos)
2. Ensure the key hasn't been revoked
3. Check if the key has expired
4. Contact your administrator

### "Rate limit exceeded" Error

1. Check your request frequency
2. Implement caching to reduce requests
3. Use exponential backoff for retries
4. Consider requesting a higher limit

### Connection Errors

1. Verify the API URL is correct
2. Check your network connection
3. Ensure firewall allows outbound HTTPS
4. Check API status page

## Support

For issues or questions:

- **Technical Issues:** Contact your Bio administrator
- **API Questions:** Refer to API_SECURITY.md
- **Feature Requests:** Submit via your organization's process

## Example: Complete Application

Here's a complete example of a Node.js application using the API:

```javascript
require('dotenv').config();
const axios = require('axios');

class BioAPIClient {
  constructor(apiKey, baseURL) {
    this.client = axios.create({
      baseURL: baseURL || 'https://api.yourdomain.com',
      headers: {
        'X-API-Key': apiKey,
      },
      timeout: 30000,
    });
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          console.log(`Rate limited. Waiting ${retryAfter}s...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.client.request(error.config);
        }
        throw error;
      }
    );
  }
  
  async getDiscordChannels() {
    const response = await this.client.get('/api/discord/channels');
    return response.data;
  }
  
  async getDiscordReports(filters = {}) {
    const response = await this.client.get('/api/discord/reports', { params: filters });
    return response.data;
  }
  
  async getDAOs(page = 1, limit = 50) {
    const response = await this.client.get('/daos', { params: { page, limit } });
    return response.data;
  }
}

// Usage
const client = new BioAPIClient(process.env.BIO_API_KEY);

async function main() {
  try {
    const channels = await client.getDiscordChannels();
    console.log('Discord channels:', channels);
    
    const reports = await client.getDiscordReports({ reportType: 'weekly' });
    console.log('Weekly reports:', reports);
    
    const daos = await client.getDAOs();
    console.log('DAOs:', daos);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

## Changelog

- **2025-11-20:** Initial API key system release
- Rate limit: 1000 requests per 15 minutes
- Full read access to all endpoints
- SHA-256 hashed storage

