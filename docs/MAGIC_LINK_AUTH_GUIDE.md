# Magic Link Authentication Guide

This application now supports **passwordless authentication** using Supabase Magic Links. This is a secure, user-friendly way to authenticate without managing passwords.

## 🔐 How Magic Link Authentication Works

### Security Features
- ✅ **No passwords to remember** - Users authenticate via email
- ✅ **Secure tokens** - Each magic link contains a unique, time-limited token
- ✅ **Email verification** - Proves user owns the email address
- ✅ **Auto-expiring links** - Links expire after 1 hour by default
- ✅ **One-time use** - Each link can only be used once
- ✅ **Industry standard** - Used by Slack, Notion, Medium, and many others

### How It's Secure
1. **Email as proof of identity** - Only the email owner can access the link
2. **Cryptographic tokens** - Links use secure, random tokens (not guessable)
3. **Time-limited** - Links expire quickly, reducing attack window
4. **HTTPS required** - Links only work over secure connections
5. **Session management** - Supabase handles secure session tokens after authentication

## 👥 Inviting Users (Admin)

### Simple Method: Use Supabase "Invite User"

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Invite User"**
3. Enter the user's email
4. Click **"Send Invite"**

That's it! The user will receive an email with a magic link.

### User Experience

When a user receives the invite:

1. **Opens email** - Receives invite from your app
2. **Clicks magic link** - Link in email (e.g., `https://dashboard.bioagents.dev/...`)
3. **Automatically logged in** - Redirected to dashboard
4. **Session persists** - Stays logged in (secure JWT token)

### Subsequent Logins

Users can log in anytime by:

1. Going to `https://dashboard.bioagents.dev/login`
2. Clicking **"Magic Link"** tab
3. Entering their email
4. Clicking **"Send Magic Link"**
5. Checking email and clicking the link

**No password needed!**

## ⚙️ Supabase Configuration

### 1. Configure Site URL (Required)

1. Go to **Project Settings** → **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://dashboard.bioagents.dev`
3. Click **Save**

### 2. Add Redirect URLs

In the same section, add these redirect URLs:

```
https://dashboard.bioagents.dev/**
https://dashboard.bioagents.dev/
```

### 3. Configure Email Template (Optional)

Customize the magic link email:

1. Go to **Authentication** → **Email Templates**
2. Select **"Magic Link"** template
3. Customize the content
4. Ensure it includes: `{{ .ConfirmationURL }}`
5. Save changes

Example template:

```html
<h2>Sign in to Bio Dashboard</h2>
<p>Click the link below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>This link expires in 1 hour.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

## 🎯 Setting User Roles

By default, invited users get the `member` role. To make someone an admin:

### Via Supabase Dashboard

1. Go to **Authentication** → **Users**
2. Click on the user
3. Scroll to **User Metadata**
4. Add/edit:
   ```json
   {
     "role": "admin"
   }
   ```
5. Save

### Via SQL

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'user@example.com';
```

## 🔄 Login Options

The login page now offers **two authentication methods**:

### 1. Magic Link (Passwordless)
- User enters email
- Receives magic link via email
- Clicks link to sign in
- **Recommended for most users**

### 2. Password (Traditional)
- User enters email + password
- Signs in immediately
- **For users who prefer passwords**

Users can toggle between methods on the login page.

## 🛡️ Security Best Practices

### For Admins

1. **Only invite known users** - Verify email addresses before inviting
2. **Use admin role sparingly** - Only give admin access when needed
3. **Monitor user list** - Regularly review who has access
4. **Set up email alerts** - Configure Supabase to notify you of new signups

### For Users

1. **Keep email secure** - Magic links are as secure as your email
2. **Don't share links** - Each magic link is personal and one-time use
3. **Check sender** - Verify emails come from your Supabase domain
4. **Report suspicious emails** - Contact admin if you receive unexpected magic links

## 🔧 Troubleshooting

### User doesn't receive magic link email

**Check:**
- Email is spelled correctly
- Check spam/junk folder
- Verify Supabase email service is configured
- Check Supabase email logs (Dashboard → Logs)

**Solution:**
- Resend the invite
- Configure custom SMTP if using default Supabase email

### Magic link doesn't work

**Common causes:**
- Link expired (default: 1 hour)
- Link already used
- Redirect URL not configured
- Site URL mismatch

**Solution:**
- Request a new magic link
- Verify URL configuration in Supabase
- Check browser console for errors

### User can't access dashboard after clicking link

**Check:**
- User's email is confirmed in Supabase
- User has correct role in metadata
- No browser extensions blocking cookies
- JavaScript is enabled

**Solution:**
- Check Supabase user status
- Verify role metadata
- Try incognito/private browsing

## 📊 Comparison: Magic Link vs Password

| Feature | Magic Link | Password |
|---------|-----------|----------|
| **Security** | ✅ Very secure | ✅ Secure (if strong) |
| **User Experience** | ✅ Excellent | ⚠️ Must remember password |
| **Setup** | ✅ No setup needed | ❌ Must create password |
| **Recovery** | ✅ Built-in | ❌ Needs reset flow |
| **Phishing Risk** | ✅ Lower | ⚠️ Higher |
| **Speed** | ⚠️ Requires email check | ✅ Instant |

## 🎓 Best Practices

### When to Use Magic Links

✅ **Use magic links for:**
- Infrequent users (log in monthly)
- Non-technical users
- Mobile users
- High-security environments
- Simplified onboarding

### When to Use Passwords

✅ **Use passwords for:**
- Frequent users (daily login)
- Power users who prefer passwords
- Offline access scenarios
- Users with email access issues

## 🚀 Migration from Password-Only

If you previously used password-only authentication:

1. **No action needed** - Both methods work simultaneously
2. **Communicate change** - Let users know magic link is available
3. **Update documentation** - Point users to magic link option
4. **Monitor adoption** - Check which method users prefer

## 📝 Summary

**For Admins:**
- Invite users via Supabase Dashboard → "Invite User"
- Set roles via user metadata
- Configure Site URL and redirect URLs

**For Users:**
- Receive email invite
- Click magic link to sign in
- No password needed!
- For subsequent logins, use "Magic Link" tab on login page

**Security:**
- Magic links are secure, time-limited, one-time use tokens
- Email verification ensures user owns the email
- Industry-standard authentication method
- Reduces password-related security risks

Magic link authentication provides a **secure, user-friendly** experience without the complexity of password management! 🎉

