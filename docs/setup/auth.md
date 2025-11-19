# Authentication Setup Guide

Complete guide to setting up the invite-only authentication system for Bio Dashboard.

## Overview

The dashboard uses **invite-only authentication** with the following features:
- ✅ Strict email matching (no open signup)
- ✅ Supabase Auth for JWT tokens
- ✅ Role-based access (admin/member)
- ✅ 7-day invite expiry
- ✅ emre@bio.xyz is automatically admin

---

## Step 1: Database Setup

### Run the Migration

Execute the SQL migration on your Supabase database:

```bash
# If you have psql access:
psql $SUPABASE_DB_URL < apps/bio-internal/drizzle/0007_add_auth_and_invites.sql

# Or run it directly in Supabase SQL Editor
```

The migration creates:
- `invites` table
- `users` table
- Enums for `invite_status` and `user_role`
- Indexes for performance

### Verify Tables

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('invites', 'users');
```

---

## Step 2: Create Admin Account

### Method 1: Via Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click "Add User"
3. Enter:
   - Email: `emre@bio.xyz`
   - Password: (your secure password)
   - Auto Confirm User: **YES** ✅
4. Copy the User ID
5. Run this SQL to add admin to `users` table:

```sql
INSERT INTO users (id, email, role, full_name)
VALUES ('your-supabase-user-id', 'emre@bio.xyz', 'admin', 'Emre')
ON CONFLICT (email) DO UPDATE SET role = 'admin';
```

### Method 2: Via API (After Deployment)

```bash
# Create admin user via backend API
curl -X POST https://your-backend-url/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "emre@bio.xyz",
    "password": "your-secure-password",
    "fullName": "Emre",
    "inviteToken": "bootstrap-admin"
  }'
```

---

## Step 3: Environment Variables

### Backend (.env or Coolify)

```bash
# Supabase Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Has admin privileges
SUPABASE_JWT_SECRET=your-jwt-secret

# Database
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Other
TWITTER_BEARER_TOKEN=your-token
NODE_ENV=production
PORT=4100
```

### Frontend (Coolify Build Args)

```bash
# API Connection
VITE_API_URL=https://api.decentralabs.tech

# Supabase (for auth client)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key  # Public, safe to expose
```

**Important:**
- `SUPABASE_SERVICE_ROLE_KEY` (backend) = admin key, never expose
- `SUPABASE_ANON_KEY` (frontend) = public key, safe in browser

---

## Step 4: Deploy & Test

### 4.1 Deploy Backend

```bash
# PM2 deployment
git pull
./update.sh

# Or rebuild in Coolify
```

### 4.2 Deploy Frontend

```bash
# PM2 deployment
cd apps/bio-dashboard
VITE_API_URL=https://api.decentralabs.tech \
VITE_SUPABASE_URL=https://your-project.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key \
bun run build

cd ../..
pm2 restart bio-frontend
```

### 4.3 Test Login

1. Visit: `https://biointernal.decentralabs.tech`
2. You should see login page (not dashboard)
3. Login with `emre@bio.xyz` and your password
4. You should see the dashboard
5. Header should show "Admin" badge
6. Sidebar should have "Invites" link

---

## Step 5: Create First Invite

### Via Admin UI (Recommended)

1. Login as admin
2. Go to **Invites** (sidebar)
3. Click **+ New Invite**
4. Enter email: `user@example.com`
5. Click **Create Invite**
6. Invite link is copied to clipboard
7. Share the link with the user

### Via API (Alternative)

```bash
# Get JWT token first (login)
TOKEN=$(curl -X POST https://api.decentralabs.tech/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"emre@bio.xyz","password":"your-password"}' \
  | jq -r '.session.access_token')

# Create invite
curl -X POST https://api.decentralabs.tech/invites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

---

## Step 6: User Signup Flow

1. User receives invite link: `https://biointernal.decentralabs.tech/signup/{token}`
2. User clicks link → sees signup page
3. Email is pre-filled and locked (can't change)
4. User enters full name + password
5. Clicks "Create Account"
6. Account is created in Supabase Auth
7. User record is created in `users` table with `member` role
8. Invite is marked as `accepted`
9. User is auto-logged in → sees dashboard

---

## API Endpoints Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/signup` | Signup with invite token |
| GET | `/auth/verify-invite/:token` | Check if invite is valid |
| POST | `/auth/logout` | Logout (invalidate session) |

### Protected Endpoints (Require JWT)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/invites` | Admin | List all invites |
| POST | `/invites` | Admin | Create new invite |
| DELETE | `/invites/:id` | Admin | Revoke invite |
| POST | `/invites/:id/resend` | Admin | Generate new token |

---

## Troubleshooting

### Login Shows "Invalid token"

**Cause:** JWT verification failing

**Fix:**
1. Check `SUPABASE_JWT_SECRET` matches your project
2. Check `SUPABASE_URL` is correct
3. Try logging out and back in
4. Clear browser cookies

### Invite Link Says "Invalid or expired"

**Possible causes:**
1. Token expired (7 days)
2. Invite already used
3. Invite revoked by admin

**Fix:**
- Admin can resend invite (generates new token)
- Or create new invite for same email

### User Can't See Admin Features

**Cause:** User role is not 'admin'

**Fix:**
```sql
-- Check user role
SELECT email, role FROM users WHERE email = 'emre@bio.xyz';

-- Fix role if needed
UPDATE users SET role = 'admin' WHERE email = 'emre@bio.xyz';
```

### CORS Errors in Browser

**Cause:** Frontend can't call backend API

**Fix:**
1. Check `VITE_API_URL` is set correctly
2. Backend CORS already allows all origins
3. Check nginx/proxy configuration

### Signup Fails with "Email mismatch"

**Cause:** User trying to signup with different email than invited

**Fix:**
- This is by design (strict email matching)
- User must use the exact email that was invited
- Admin can create new invite for correct email

---

## Security Best Practices

1. **Never Expose Service Role Key**
   - Only use in backend
   - Never commit to git
   - Use environment variables

2. **Invite Token Security**
   - 32-byte random hex = 2^256 possibilities
   - One-time use
   - 7-day expiry

3. **Password Requirements**
   - Minimum 8 characters
   - Enforced by Supabase Auth
   - Stored as bcrypt hash

4. **JWT Tokens**
   - 1-hour expiry (Supabase default)
   - Auto-refresh via Supabase client
   - Validated on every API request

5. **Role-Based Access**
   - Admin: full access to invites
   - Member: view-only dashboard
   - Enforced in backend middleware

---

## Database Schema

### invites

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| email | text | Invited email (unique) |
| invited_by | text | Admin email who sent invite |
| status | enum | pending/accepted/expired/revoked |
| invite_token | text | 32-byte hex token (unique) |
| expires_at | timestamp | 7 days from creation |
| accepted_at | timestamp | When user signed up |
| user_id | uuid | Supabase auth user ID |
| created_at | timestamp | Creation time |

### users

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Same as Supabase auth.users.id |
| email | text | User email (unique) |
| role | enum | admin/member |
| full_name | text | Display name |
| avatar_url | text | Profile picture (future) |
| last_login_at | timestamp | Last login time |
| created_at | timestamp | Account creation time |

---

## Admin Workflow

### Creating Invites

1. Login as admin (`emre@bio.xyz`)
2. Go to Invites page
3. Click "+ New Invite"
4. Enter email
5. Link is auto-copied → share via email/slack/etc

### Managing Invites

- **Pending**: Not yet used, can be revoked/resent
- **Accepted**: User created account
- **Expired**: Past 7 days, can resend
- **Revoked**: Manually canceled by admin

### Resending Invites

- Generates new token
- Resets expiry to 7 days
- Old link stops working
- New link is copied to clipboard

---

## Support

For issues:
1. Check backend logs: `pm2 logs bio-backend`
2. Check frontend console: Browser DevTools
3. Verify environment variables
4. Check Supabase Auth dashboard

Admin contact: emre@bio.xyz
