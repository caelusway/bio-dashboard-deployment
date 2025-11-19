# Discord Integration Setup Guide

## 🎯 Overview

This guide will help you set up the BioSyncAgent Discord bot to automatically collect messages and generate AI-powered weekly and monthly reports for the Bio Ecosystem Discord server.

---

## 📋 Prerequisites

- Access to Bio Ecosystem Discord server (admin permissions)
- Supabase database access
- OpenAI API key
- Node.js/Bun installed

---

## 🚀 Step-by-Step Setup

### Step 1: Create Discord Bot

1. **Go to Discord Developer Portal**
   - Visit: https://discord.com/developers/applications
   - Click "New Application"
   - Name it "BioSyncAgent"

2. **Create Bot User**
   - Go to "Bot" section in left sidebar
   - Click "Add Bot" → "Yes, do it!"
   - Under "Privileged Gateway Intents", enable:
     - ✅ **SERVER MEMBERS INTENT**
     - ✅ **MESSAGE CONTENT INTENT**
   - Click "Save Changes"

3. **Copy Bot Token**
   - Click "Reset Token" and copy the token
   - ⚠️ **Keep this secret!** You'll need it for `.env`

4. **Get Application ID**
   - Go to "General Information" section
   - Copy the "Application ID" (Client ID)

### Step 2: Invite Bot to Server

1. **Generate Invite URL**
   
   Replace `YOUR_CLIENT_ID` with your Application ID:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=68608&scope=bot
   ```

2. **Invite Bot**
   - Open the URL in your browser
   - Select "Bio Ecosystem" server
   - Click "Authorize"
   - Complete the captcha

3. **Verify Bot is in Server**
   - Check your Discord server
   - Bot should appear in member list (offline until we run it)

### Step 3: Get Discord IDs

1. **Enable Developer Mode**
   - In Discord: User Settings → Advanced → Developer Mode (toggle ON)

2. **Get Guild (Server) ID**
   - Right-click on "Bio Ecosystem" server icon
   - Click "Copy Server ID"
   - Save this ID

3. **Get Channel IDs**
   
   For each channel you want to track:
   - Right-click on the channel name
   - Click "Copy Channel ID"
   - Save with channel name for reference

   Example channels to track:
   ```
   Molecule:
   - molecule-general: 1234567890123456789
   - molecule-topics: 1234567890123456790
   
   D1CkDAO:
   - d1ckdao-general: 1234567890123456791
   - d1ckdao-topics: 1234567890123456792
   
   Nootropics:
   - nootropics-general: 1234567890123456793
   
   ... etc
   ```

### Step 4: Get OpenAI API Key

1. **Sign up / Log in to OpenAI**
   - Visit: https://platform.openai.com/

2. **Create API Key**
   - Go to API Keys section
   - Click "Create new secret key"
   - Name it "BioSyncAgent"
   - Copy the key immediately (you won't see it again!)

3. **Add Credits**
   - Go to Billing section
   - Add at least $5 (should last months)
   - Cost per report: ~$0.0004 (very cheap!)

### Step 5: Configure Environment Variables

1. **Edit `.env` file** in `apps/bio-internal/`:

```bash
# Existing variables...
SUPABASE_URL=your_supabase_url
SUPABASE_DB_URL=your_database_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
TWITTER_BEARER_TOKEN=your_twitter_token

# NEW: Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here

# NEW: OpenAI API
OPENAI_API_KEY=your_openai_api_key_here
```

2. **Save the file**

### Step 6: Apply Database Migration

The migration adds 3 new tables:
- `discord_channels` - Stores channel information
- `discord_messages` - Stores all messages
- `discord_reports` - Stores generated reports

**Option A: Using Drizzle (Recommended)**

```bash
cd apps/bio-internal
bun run drizzle:migrate
```

**Option B: Manual SQL**

```bash
cd apps/bio-internal
psql $SUPABASE_DB_URL -f drizzle/0008_add_discord_tables.sql
```

**Verify Migration**

Check in Supabase Dashboard → Table Editor:
- ✅ `discord_channels` table exists
- ✅ `discord_messages` table exists
- ✅ `discord_reports` table exists

### Step 7: Configure Channel Mappings

1. **Edit** `apps/bio-internal/scripts/discord-sync-and-report.ts`

2. **Update CHANNEL_MAPPINGS** with your actual channel IDs:

```typescript
const CHANNEL_MAPPINGS = [
  // Molecule DAO
  {
    channelId: '1234567890123456789', // Replace with real ID
    daoSlug: 'molecule',
    channelName: 'molecule-general',
  },
  {
    channelId: '1234567890123456790', // Replace with real ID
    daoSlug: 'molecule',
    channelName: 'molecule-topics',
  },
  
  // D1CkDAO
  {
    channelId: '1234567890123456791', // Replace with real ID
    daoSlug: 'd1ckdao',
    channelName: 'd1ckdao-general',
  },
  
  // Add all your channels...
];
```

3. **Verify DAO Slugs**
   
   Make sure the `daoSlug` values match your database:
   ```sql
   SELECT slug, name FROM dao_entities;
   ```

### Step 8: Run Initial Sync (Proof of Concept)

```bash
cd apps/bio-internal
bun run discord:sync
```

This will:
1. ✅ Sync all configured channels to database
2. ✅ Backfill last 7 days of messages
3. ✅ Generate weekly reports for each channel
4. ✅ Print reports to console

**Expected Output:**
```
🚀 Starting Discord Sync and Report Generation...

📡 Step 1: Syncing Discord channels...
✅ Synced channel: molecule-general (1234567890123456789)
✅ Synced channel: molecule-topics (1234567890123456790)
...

📥 Step 2: Backfilling messages (last 7 days)...
  ✅ molecule-general: 245 messages synced
  ✅ molecule-topics: 89 messages synced
...

📊 Step 3: Generating weekly reports...
  📝 Generating report for molecule-general...
  ✅ Report generated for molecule-general

# Weekly Report: molecule-general
**DAO/Project:** Molecule
**Report Generated:** 2025-01-15

---

## 📊 Key Metrics
- **Total Messages:** 245
- **Unique Contributors:** 34
- **Average Messages/Day:** 35.0
...

🎉 Discord sync and report generation completed successfully!
```

---

## 🔄 Ongoing Usage

### Daily Sync (Recommended)

Add to your cron jobs or scheduler:

```bash
# Daily at 2 AM
0 2 * * * cd /path/to/bio-dashboard-deployment/apps/bio-internal && bun run discord:sync
```

### Manual Sync

```bash
cd apps/bio-internal
bun run discord:sync
```

### View Reports in Database

```sql
-- Get latest reports
SELECT 
  dr.report_type,
  dr.period_start,
  dr.period_end,
  dc.name as channel_name,
  de.name as dao_name,
  dr.summary
FROM discord_reports dr
JOIN discord_channels dc ON dr.channel_id = dc.id
LEFT JOIN dao_entities de ON dc.dao_id = de.id
ORDER BY dr.created_at DESC
LIMIT 10;
```

### View Message Statistics

```sql
-- Messages per channel (last 7 days)
SELECT 
  dc.name as channel_name,
  de.name as dao_name,
  COUNT(dm.id) as message_count,
  COUNT(DISTINCT dm.author_id) as unique_authors
FROM discord_messages dm
JOIN discord_channels dc ON dm.channel_id = dc.id
LEFT JOIN dao_entities de ON dc.dao_id = de.id
WHERE dm.posted_at >= NOW() - INTERVAL '7 days'
GROUP BY dc.name, de.name
ORDER BY message_count DESC;
```

---

## 🛠️ Troubleshooting

### Bot Can't Read Messages

**Problem:** Bot shows as online but no messages are synced

**Solution:**
1. Check bot has "Read Message History" permission in Discord
2. Verify "Message Content Intent" is enabled in Developer Portal
3. Re-invite bot with correct permissions
4. Bot can only read messages sent AFTER it joined

### Missing Environment Variables

**Problem:** `❌ DISCORD_BOT_TOKEN environment variable is required`

**Solution:**
1. Check `.env` file exists in `apps/bio-internal/`
2. Verify all three variables are set:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_GUILD_ID`
   - `OPENAI_API_KEY`
3. No quotes needed around values

### Channel Not Found

**Problem:** `❌ Channel 1234567890123456789 not found in database`

**Solution:**
1. Run sync script (it syncs channels first)
2. Verify channel ID is correct (copy again from Discord)
3. Check bot has access to that channel

### DAO Not Found

**Problem:** `⚠️  DAO with slug molecule not found`

**Solution:**
1. Check DAO exists in database:
   ```sql
   SELECT * FROM dao_entities WHERE slug = 'molecule';
   ```
2. Update `daoSlug` in `CHANNEL_MAPPINGS` to match database

### OpenAI API Error

**Problem:** `❌ OpenAI API error: 401 Unauthorized`

**Solution:**
1. Verify API key is correct
2. Check you have credits in OpenAI account
3. Verify API key has correct permissions

### Rate Limiting

**Problem:** `❌ Discord rate limit exceeded`

**Solution:**
- The service handles rate limits automatically
- If persistent, reduce number of channels synced at once
- Wait a few minutes and try again

---

## 📊 Cost Estimation

### OpenAI API Costs

Using GPT-4o-mini model:
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens

**Per Report:**
- Average input: ~2,000 tokens
- Average output: ~500 tokens
- Cost: ~$0.0004 per report

**Monthly Cost (50 channels):**
- Weekly reports: 50 × 4 = 200 reports/month
- Monthly reports: 50 × 1 = 50 reports/month
- Total: 250 reports × $0.0004 = **$0.10/month**

**Very affordable!** 🎉

### Discord API

- Free (no costs)
- Rate limits handled automatically

---

## 🎯 Next Steps

After successful setup:

1. **Schedule Daily Syncs**
   - Set up cron job or deployment scheduler
   - Recommended: Daily at 2 AM

2. **Monitor Reports**
   - Check Supabase database for generated reports
   - Review AI summaries for insights

3. **Expand Coverage**
   - Add more channels as needed
   - Adjust backfill period (7-30 days)

4. **Dashboard Integration** (Future)
   - Display reports in Bio Dashboard
   - Add charts and visualizations
   - Create alerts for low activity

5. **Automation** (Future)
   - Auto-post reports to Discord
   - Email summaries to team
   - Slack integration

---

## 📚 Additional Resources

- [Discord Bot Documentation](https://discord.com/developers/docs/intro)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Service README](../apps/bio-internal/src/services/discord/README.md)

---

## 🆘 Support

For issues or questions:
1. Check troubleshooting section above
2. Review service README
3. Contact Bio internal team

---

**Happy Syncing! 🚀**

