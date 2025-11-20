# API Security Documentation

## Overview

The bio-internal API implements multi-layered security to protect internal data and prevent unauthorized access. This document covers authentication methods, rate limiting, security headers, and best practices.

## Security Layers

### 1. Authentication

The API supports **two authentication methods**:

#### A. JWT Tokens (for frontend dashboard users)

Users authenticate via Supabase and receive a JWT token.

**Example:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  https://api.yourdomain.com/api/discord/channels
```

#### B. API Keys (for external applications)

External apps use API keys for service-to-service authentication.

**Example:**
```bash
curl -H "X-API-Key: bio_live_xxxxx" \
  https://api.yourdomain.com/api/discord/channels
```

### 2. Rate Limiting

- **Limit:** 1000 requests per 15 minutes
- **Identifier:** API key prefix or IP address
- **Response:** HTTP 429 with `Retry-After` header

**Example Response:**
```json
HTTP/1.1 429 Too Many Requests
Retry-After: 300

{
  "error": "Rate limit exceeded. Please try again later."
}
```

### 3. Security Headers

All responses include security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### 4. CORS Policy

**Development:**
- Allows `localhost:3000`, `localhost:5173`, and `127.0.0.1` variants

**Production:**
- Only allows origins specified in `FRONTEND_URL` and `DASHBOARD_URL` environment variables

### 5. Request Logging

All API requests are logged for audit purposes:

```
[2025-11-20T12:34:56.789Z] GET /api/discord/channels - IP: 192.168.1.1 - UA: Mozilla/5.0...
```

## Authentication Methods Comparison

| Feature | JWT Tokens | API Keys |
|---------|-----------|----------|
| **Use Case** | Frontend dashboard users | External applications |
| **Expiration** | Session-based (Supabase) | Optional (configurable) |
| **Permissions** | Role-based (admin/member) | Full read access |
| **Revocation** | Via Supabase | Instant (admin dashboard) |
| **Generation** | Automatic (on login) | Manual (admin only) |

## API Endpoints

### Protected Endpoints

All the following endpoints require authentication (JWT or API key):

- `/api/discord/*` - Discord data and reports
- `/daos/*` - DAO analytics and metrics
- `/v1/twitter/*` - Twitter data ingestion and analytics
- `/api/growth/*` - Growth metrics and analytics
- `/api/keys/*` - API key management (admin only)

### Public Endpoints

- `/health` - Health check
- `/auth/login` - User login
- `/auth/signup` - User signup (invite-based)

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

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

## Best Practices

### For Frontend Developers

1. **Always use JWT tokens** from Supabase authentication
2. **Handle 401 errors** by redirecting to login
3. **Implement token refresh** to maintain sessions
4. **Never expose API keys** in frontend code

### For External App Developers

1. **Store API keys securely** (environment variables, secrets manager)
2. **Never commit API keys** to version control
3. **Implement exponential backoff** for rate limit errors
4. **Monitor API key usage** via the admin dashboard
5. **Rotate keys periodically** for security

### For Administrators

1. **Generate unique keys** for each external application
2. **Use descriptive names** for easy identification
3. **Set expiration dates** for temporary access
4. **Revoke unused keys** immediately
5. **Monitor last used timestamps** to detect inactive keys
6. **Review audit logs** regularly

## Security Considerations

### API Key Storage

- API keys are **hashed** using SHA-256 before storage
- Only the **key prefix** (first 16 characters) is stored in plaintext
- Full keys are **shown only once** at creation time

### Rate Limiting

- Rate limits apply **per IP or API key**
- Limits reset every **15 minutes**
- Exceeding limits results in **temporary blocking**

### CORS

- Production environment uses **strict origin checking**
- Only whitelisted domains can make requests
- Credentials (cookies, auth headers) are allowed

## Environment Variables

Required environment variables for security features:

```bash
# Supabase (for JWT authentication)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Frontend URLs (for CORS)
FRONTEND_URL=https://dashboard.yourdomain.com
DASHBOARD_URL=https://dashboard.yourdomain.com

# Optional: Additional API secret
INTERNAL_API_SECRET=your-secret-here
```

## Monitoring & Debugging

### Check Authentication

```bash
# Test JWT authentication
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.yourdomain.com/auth/me

# Test API key authentication
curl -H "X-API-Key: bio_live_xxxxx" \
  https://api.yourdomain.com/api/discord/channels
```

### Check Rate Limits

Monitor response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1637424000
```

### View Logs

Check server logs for authentication attempts:
```bash
# Backend logs
docker logs bio-internal

# Filter for authentication
docker logs bio-internal 2>&1 | grep "\[flexAuth\]"
```

## Troubleshooting

### "Authentication required" Error

**Cause:** Missing or invalid authentication header

**Solution:**
- Ensure you're sending either `Authorization: Bearer TOKEN` or `X-API-Key: KEY`
- Verify the token/key is valid and not expired

### "Rate limit exceeded" Error

**Cause:** Too many requests in a short time

**Solution:**
- Wait for the time specified in `Retry-After` header
- Implement exponential backoff in your client
- Consider caching responses

### "Origin not allowed" Error

**Cause:** CORS policy blocking the request

**Solution:**
- Verify your domain is in the `FRONTEND_URL` or `DASHBOARD_URL` environment variables
- For development, use `localhost` or `127.0.0.1`

## Support

For security issues or questions:
- **Internal:** Contact the platform team
- **External:** Contact your Bio administrator

**Never share API keys or JWT tokens in support requests!**

