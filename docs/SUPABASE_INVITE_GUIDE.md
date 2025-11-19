# Supabase Invite System Guide

This application now uses **Supabase's native authentication system** for user management and invites.

## How to Invite Users

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Authentication** → **Users**

### Step 2: Invite a New User (Two Methods)

#### Method A: Invite with Password Setup (Recommended)
This forces users to set their own password:

1. Click **"Add user"** dropdown → Select **"Create new user"**
2. Enter the user's **email address**
3. **Check** the box: ☑️ **"Auto Confirm User"** (important!)
4. **Leave password field EMPTY** or use a temporary one
5. Click **"Create user"**
6. After user is created, click on the user in the list
7. Click **"Send password reset email"** button
8. User will receive an email to set their password

#### Method B: Direct Invite (Auto-login, No Password)
⚠️ **This is what you're experiencing** - User gets logged in without setting a password:

1. Click **"Invite User"** button
2. Enter email
3. User receives magic link
4. Clicking link logs them in directly (no password setup)

**Problem:** User doesn't know their password and can't log in later!

### Recommended Flow: Force Password Setup

To ensure users MUST set a password, use **Method A** above, or configure Supabase to disable auto-login:

### Step 3: User Onboarding Flow

When a user receives the password reset email (Method A):

1. **User clicks the password reset link** in their email
2. They are redirected to: `https://dashboard.bioagents.dev/update-password`
3. **User sets their password** (minimum 8 characters)
4. After setting password, they are automatically logged in and redirected to the dashboard
5. **User can now log in anytime** with their email and password

## How to Fix Users Who Were Auto-Logged In (No Password)

If you already invited users and they were auto-logged in without setting a password:

### Option 1: Send Password Reset Email
1. Go to **Authentication** → **Users** in Supabase
2. Find the user
3. Click on the user
4. Click **"Send password reset email"**
5. User will receive an email to set their password

### Option 2: Set Password Manually (Admin)
1. Go to **Authentication** → **Users**
2. Click on the user
3. Scroll to **"User Management"** section
4. Click **"Reset Password"**
5. Enter a temporary password
6. Give this password to the user
7. Tell them to log in and change it

### Option 3: Delete and Re-invite
1. Delete the user from Supabase
2. Re-invite using **Method A** (Create user → Send password reset)

## Setting User Roles

By default, all invited users have the `member` role. To make a user an admin:

### Option 1: Via Supabase Dashboard
1. Go to **Authentication** → **Users**
2. Click on the user
3. Scroll to **User Metadata**
4. Add/Edit the metadata:
   ```json
   {
     "role": "admin"
   }
   ```
5. Save changes

### Option 2: Via SQL (Recommended for bulk operations)
Run this in your Supabase SQL Editor:

```sql
-- Update user metadata to set admin role
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'user@example.com';
```

## Email Configuration

### **IMPORTANT: Configure Site URL (Required)**

Before inviting users, you **must** configure your Supabase Site URL:

1. Go to **Project Settings** → **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://dashboard.bioagents.dev`
3. Click **Save**

⚠️ **Without this, invite emails will use `http://localhost:3000` by default!**

### Add Redirect URLs

In the same **URL Configuration** section:

1. Add these to **Redirect URLs** (one per line):
   ```
   https://dashboard.bioagents.dev/**
   https://dashboard.bioagents.dev/update-password
   https://dashboard.bioagents.dev/
   ```
2. Click **Save**

### Customize Invite Email Template

1. Go to **Authentication** → **Email Templates**
2. Select **"Invite user"** template
3. Customize the email content if desired
4. **Verify** the confirmation link uses: `{{ .ConfirmationURL }}`
   - This will automatically use your Site URL
5. Save changes

## User Roles

The application supports two roles:

- **`member`** (default): Can view all data
- **`admin`**: Full access (same as member currently, can be extended)

Role is stored in Supabase `user_metadata.role` and checked on the frontend.

## Troubleshooting

### User can't access the dashboard after setting password
- Check that their email is confirmed in Supabase Dashboard
- Verify the user's role is set correctly in metadata
- Check browser console for any auth errors

### Invite email not received
- Check Supabase email settings
- Verify email service is configured (SMTP or Supabase's default)
- Check spam folder

### Password reset link not working
- Ensure redirect URLs are configured correctly in Supabase
- Check that the link hasn't expired (default: 1 hour)

## Security Notes

- All passwords are managed by Supabase (bcrypt hashed)
- Invite links expire after 1 hour by default
- Email confirmation is required before users can log in
- Sessions are managed via JWT tokens with automatic refresh

## Migration from Custom Invite System

If you previously used the custom invite system:

1. **Delete old invite records** from the `invites` table (they are no longer used)
2. **Re-invite users** via Supabase Dashboard
3. Users will receive new invite emails and can set their passwords

The custom `invites` table and related backend routes are no longer used but can be kept for historical records if needed.

