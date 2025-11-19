# Supabase Invite System Guide

This application now uses **Supabase's native authentication system** for user management and invites.

## How to Invite Users

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Authentication** → **Users**

### Step 2: Invite a New User
1. Click **"Invite User"** button
2. Enter the user's email address
3. Click **"Send Invite"**

Supabase will automatically send an email to the user with a secure invite link.

### Step 3: User Onboarding Flow

When a user receives the invite email:

1. **User clicks the invite link** in their email
2. They are redirected to: `https://dashboard.bioagents.dev/update-password`
3. **User sets their password** (minimum 8 characters)
4. After setting password, they are automatically logged in and redirected to the dashboard

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

### Customize Invite Email Template
1. Go to **Authentication** → **Email Templates**
2. Select **"Invite user"** template
3. Customize the email content
4. Make sure the confirmation link points to: `{{ .ConfirmationURL }}`

### Set Redirect URL
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://dashboard.bioagents.dev`
3. Add **Redirect URLs**:
   - `https://dashboard.bioagents.dev/update-password`
   - `https://dashboard.bioagents.dev/`

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

