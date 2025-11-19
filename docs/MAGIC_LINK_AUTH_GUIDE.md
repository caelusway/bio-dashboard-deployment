# 🔐 Magic Link Authentication Guide

## Overview

The Bio Dashboard uses **passwordless authentication** via Supabase Magic Links. This provides a secure, user-friendly login experience without the need for passwords.

## 🎯 Key Benefits

- ✅ **No passwords to remember** - Users just need their email
- ✅ **More secure** - No password to steal or leak
- ✅ **Better UX** - One-click login from email
- ✅ **Industry standard** - Used by Slack, Notion, Medium
- ✅ **Simple onboarding** - Invite users instantly

---

## 👥 How to Invite Users

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**

### Step 2: Invite User
1. Click **"Invite User"** button
2. Enter the user's email address
3. Click **"Send Invite"**

**That's it!** The user will receive an email with a magic link to sign in.

---

## 🔑 How Users Log In

### First Time Login (After Invite)
1. User receives invite email from Supabase
2. Clicks the magic link in the email
3. **Automatically signed in** to the dashboard
4. No password setup required!

### Subsequent Logins
1. Go to `https://dashboard.bioagents.dev/login`
2. Enter email address
3. Click **"Send Magic Link"**
4. Check email and click the link
5. **Automatically signed in**

---

## ⚙️ Configuration

### Required Supabase Settings

Go to **Project Settings** → **Authentication** → **URL Configuration**

1. **Site URL:** `https://dashboard.bioagents.dev`
2. **Redirect URLs:** Add these:
   - `https://dashboard.bioagents.dev/**`
   - `https://dashboard.bioagents.dev/`

### Email Templates (Optional)

You can customize the magic link email template in:
**Authentication** → **Email Templates** → **Magic Link**

---

## 🔒 Security Features

### How Magic Links Work
1. User requests a magic link
2. Supabase generates a **cryptographically secure token**
3. Token is sent via email
4. Token is **valid for 1 hour**
5. Token is **single-use** (can't be reused)
6. Token verifies email ownership

### Security Best Practices
- ✅ Magic links expire after 1 hour
- ✅ Links are one-time use only
- ✅ Email verification is built-in
- ✅ No password to be compromised
- ✅ Rate limiting prevents abuse

---

## 🎨 User Experience Flow

### Login Page
```
┌─────────────────────────────────┐
│     Bio Dashboard               │
│     Sign in with your email     │
│                                 │
│  Email Address                  │
│  ┌───────────────────────────┐ │
│  │ your@email.com            │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │  📧 Send Magic Link       │ │
│  └───────────────────────────┘ │
│                                 │
│  🔐 Passwordless Authentication │
│  We'll send you a secure link  │
│  to sign in. No password       │
│  required!                      │
└─────────────────────────────────┘
```

### Email Received
```
Subject: Magic Link - Sign in to Bio Dashboard

Click the link below to sign in:
[Sign In to Bio Dashboard]

This link expires in 1 hour.
```

### After Clicking Link
```
✅ Redirected to dashboard
✅ Automatically authenticated
✅ Ready to use the app
```

---

## 🛠️ Troubleshooting

### User Didn't Receive Email
1. Check spam/junk folder
2. Verify email address is correct
3. Check Supabase email logs in dashboard
4. Ensure email provider isn't blocking Supabase emails

### Magic Link Expired
- Links expire after 1 hour
- User should request a new magic link from login page

### Wrong Redirect URL
- Ensure Site URL is set to `https://dashboard.bioagents.dev`
- Check Redirect URLs include the production domain
- Rebuild frontend if env vars changed

### User Can't Access Dashboard
- Verify user exists in Supabase Authentication
- Check user's email is confirmed
- Ensure user clicked the magic link (not just opened email)

---

## 📋 Admin Checklist

Before inviting users, ensure:

- [ ] Supabase Site URL is set to production domain
- [ ] Redirect URLs include production domain
- [ ] Email templates are configured (optional)
- [ ] Frontend is deployed with correct Supabase env vars
- [ ] Test login flow with your own email first

---

## 💡 Best Practices

### For Admins
- Test the invite flow before sending to real users
- Use a clear email subject line in templates
- Monitor Supabase email logs for delivery issues
- Keep Site URL and Redirect URLs up to date

### For Users
- Use the same email address consistently
- Don't share magic links (they're personal)
- Request a new link if expired
- Check spam folder if email doesn't arrive

---

## 🚀 Quick Start

1. **Invite a user:**
   ```
   Supabase Dashboard → Authentication → Users → Invite User
   ```

2. **User receives email and clicks link**

3. **User is automatically signed in to dashboard**

4. **For future logins:**
   ```
   Login page → Enter email → Send Magic Link → Click link in email
   ```

---

## 📞 Support

If users have issues logging in:
1. Verify their email is in Supabase Users list
2. Check Supabase email logs for delivery status
3. Ensure Site URL and Redirect URLs are correct
4. Test the flow yourself to reproduce the issue

---

## 🎉 Summary

**Magic Link authentication provides:**
- ✅ **Security** - No passwords to compromise
- ✅ **Simplicity** - Just email, no password to remember
- ✅ **Speed** - Instant onboarding
- ✅ **Reliability** - Industry-proven method

Your users will love the seamless, passwordless experience! 🚀
