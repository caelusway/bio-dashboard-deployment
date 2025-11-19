# Discord Production Setup Guide

This guide explains how to set up Discord integration in production with:
1. **Real-time message sync** - Bot listens and saves messages as they happen
2. **Automated weekly/monthly reports** - Scheduled via cron jobs

---

## 🏗️ Architecture

### Real-time Message Sync
- Discord bot runs **inside your main app** (`bio-internal`)
- Listens to all messages in tracked channels
- Saves messages to database immediately
- Runs 24/7 alongside your API

### Report Generation
- **Separate cron jobs** run weekly/monthly
- Generate AI-powered reports using OpenAI
- Can be scheduled via:
  - System crontab
  - Coolify cron jobs
  - GitHub Actions
  - Any other scheduler

---

## 📋 Prerequisites

1. ✅ Discord bot created and invited to server
2. ✅ All channels synced to database (run `bun run discord:backfill` once)
3. ✅ Environment variables configured:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_GUILD_ID`
   - `OPENAI_API_KEY`
   - `ENABLE_DISCORD_BOT=true` (to enable real-time sync)

---

## 🚀 Setup Instructions

### Step 1: Initial Backfill (One-time)

Before starting the bot, backfill historical messages:

```bash
cd apps/bio-internal

# Backfill last 14 days (adjust as needed)
bun run discord:backfill 14
```

This ensures you have historical context before the bot starts listening.

---

### Step 2: Enable Real-time Bot

Add to your `.env` file:

```bash
ENABLE_DISCORD_BOT=true
```

When you start/restart your `bio-internal` service, the bot will automatically:
- ✅ Connect to Discord
- ✅ Listen to all tracked channels
- ✅ Save new messages in real-time
- ✅ Update edited messages

**Docker Compose:**
```yaml
services:
  backend:
    environment:
      - ENABLE_DISCORD_BOT=true
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - DISCORD_GUILD_ID=${DISCORD_GUILD_ID}
```

**Coolify:**
- Add `ENABLE_DISCORD_BOT=true` to your environment variables
- Redeploy the service

---

### Step 3: Schedule Weekly Reports

#### Option A: System Crontab (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line (runs every Monday at 9:00 AM UTC)
0 9 * * 1 cd /path/to/bio-dashboard-deployment/apps/bio-internal && /usr/local/bin/bun run discord:weekly-report >> /var/log/discord-weekly-reports.log 2>&1
```

#### Option B: Coolify Scheduled Tasks

1. Go to your Coolify project
2. Navigate to "Scheduled Tasks" or "Cron Jobs"
3. Add a new task:
   - **Name:** Discord Weekly Reports
   - **Schedule:** `0 9 * * 1` (Every Monday at 9:00 AM UTC)
   - **Command:** `bun run discord:weekly-report`
   - **Container:** `bio-internal`

#### Option C: GitHub Actions

Create `.github/workflows/discord-weekly-reports.yml`:

```yaml
name: Discord Weekly Reports

on:
  schedule:
    # Every Monday at 9:00 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch: # Manual trigger

jobs:
  generate-reports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: |
          cd apps/bio-internal
          bun install
      
      - name: Generate weekly reports
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          DISCORD_BOT_TOKEN: ${{ secrets.DISCORD_BOT_TOKEN }}
          DISCORD_GUILD_ID: ${{ secrets.DISCORD_GUILD_ID }}
        run: |
          cd apps/bio-internal
          bun run discord:weekly-report
```

---

### Step 4: Schedule Monthly Reports

#### Option A: System Crontab

```bash
# Edit crontab
crontab -e

# Add this line (runs 1st of every month at 10:00 AM UTC)
0 10 1 * * cd /path/to/bio-dashboard-deployment/apps/bio-internal && /usr/local/bin/bun run discord:monthly-report >> /var/log/discord-monthly-reports.log 2>&1
```

#### Option B: Coolify Scheduled Tasks

1. Add a new task:
   - **Name:** Discord Monthly Reports
   - **Schedule:** `0 10 1 * *` (1st of every month at 10:00 AM UTC)
   - **Command:** `bun run discord:monthly-report`
   - **Container:** `bio-internal`

#### Option C: GitHub Actions

Create `.github/workflows/discord-monthly-reports.yml`:

```yaml
name: Discord Monthly Reports

on:
  schedule:
    # 1st of every month at 10:00 AM UTC
    - cron: '0 10 1 * *'
  workflow_dispatch: # Manual trigger

jobs:
  generate-reports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: |
          cd apps/bio-internal
          bun install
      
      - name: Generate monthly reports
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          DISCORD_BOT_TOKEN: ${{ secrets.DISCORD_BOT_TOKEN }}
          DISCORD_GUILD_ID: ${{ secrets.DISCORD_GUILD_ID }}
        run: |
          cd apps/bio-internal
          bun run discord:monthly-report
```

---

## 🔍 Monitoring & Verification

### Check if Bot is Running

```bash
# Check logs
docker logs bio-internal-backend -f

# You should see:
# ✅ Discord bot logged in as BioSyncAgent#1234
# 📡 Tracking 111 Discord channels for real-time sync
```

### Verify Messages are Being Saved

```bash
# Check database
psql $SUPABASE_DB_URL -c "
  SELECT 
    COUNT(*) as total_messages,
    MAX(posted_at) as latest_message
  FROM discord_messages;
"
```

### Test Weekly Report Manually

```bash
cd apps/bio-internal
bun run discord:weekly-report
```

### Test Monthly Report Manually

```bash
cd apps/bio-internal
bun run discord:monthly-report
```

---

## 📊 Cron Schedule Reference

| Task | Schedule | Cron Expression | Description |
|------|----------|-----------------|-------------|
| Weekly Reports | Every Monday 9:00 AM UTC | `0 9 * * 1` | Generates reports for last 7 days |
| Monthly Reports | 1st of month 10:00 AM UTC | `0 10 1 * *` | Generates reports for last 30 days |

**Cron Expression Format:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, 0 and 7 = Sunday)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

---

## 🛠️ Troubleshooting

### Bot Not Connecting

```bash
# Check environment variables
echo $DISCORD_BOT_TOKEN
echo $DISCORD_GUILD_ID
echo $ENABLE_DISCORD_BOT

# Check bot permissions in Discord
# Bot needs: Read Messages, Read Message History, View Channels
```

### Messages Not Being Saved

```bash
# Check if channels are in database
psql $SUPABASE_DB_URL -c "SELECT COUNT(*) FROM discord_channels;"

# If 0, run backfill first
bun run discord:backfill
```

### Reports Not Generating

```bash
# Check OpenAI API key
echo $OPENAI_API_KEY

# Check if messages exist
psql $SUPABASE_DB_URL -c "
  SELECT 
    c.name,
    COUNT(m.id) as message_count
  FROM discord_channels c
  LEFT JOIN discord_messages m ON c.id = m.channel_id
  GROUP BY c.name
  ORDER BY message_count DESC
  LIMIT 10;
"
```

### Cron Job Not Running

```bash
# Check crontab
crontab -l

# Check cron logs (Linux)
grep CRON /var/log/syslog

# Test script manually
cd apps/bio-internal
bun run discord:weekly-report
```

---

## 📈 Scaling Considerations

### High Message Volume

If you have very active channels (1000+ messages/day):

1. **Database Indexing** - Already handled in schema
2. **Rate Limiting** - Discord.js handles this automatically
3. **Memory** - Bot uses minimal memory (~50-100MB)

### Cost Optimization

**OpenAI API Costs:**
- Weekly reports: ~$0.10-0.50 per channel per week
- Monthly reports: ~$0.50-2.00 per channel per month
- Total for 111 channels: ~$100-200/month

**To reduce costs:**
- Generate reports only for active channels
- Use GPT-4o-mini instead of GPT-4o
- Increase report frequency (bi-weekly instead of weekly)

---

## 🔄 Updating Channel Mappings

When you add new channels to Discord:

1. Run discovery:
   ```bash
   bun run discord:discover
   ```

2. Update mappings in `discord-backfill-messages.ts`

3. Run backfill:
   ```bash
   bun run discord:backfill
   ```

4. Restart bot (it will automatically pick up new channels):
   ```bash
   # Docker
   docker restart bio-internal-backend
   
   # Coolify
   # Redeploy the service
   ```

---

## ✅ Production Checklist

- [ ] Initial backfill completed
- [ ] `ENABLE_DISCORD_BOT=true` in production `.env`
- [ ] Bot connected and logging messages
- [ ] Weekly report cron scheduled
- [ ] Monthly report cron scheduled
- [ ] Test reports generated successfully
- [ ] Monitoring/alerting set up (optional)
- [ ] Database backups configured

---

## 🎯 Summary

**Real-time Sync:**
- ✅ Runs inside `bio-internal` app
- ✅ Enable with `ENABLE_DISCORD_BOT=true`
- ✅ Saves messages as they happen

**Reports:**
- ✅ Separate cron scripts
- ✅ Weekly: Every Monday 9:00 AM UTC
- ✅ Monthly: 1st of month 10:00 AM UTC
- ✅ Schedule via crontab, Coolify, or GitHub Actions

**No in-app cron needed!** 🎉

