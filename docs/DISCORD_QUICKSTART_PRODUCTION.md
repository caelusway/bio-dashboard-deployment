# Discord Production Quick Start

## 🚀 Get Discord Integration Running in 5 Minutes

### Step 1: One-time Setup (Run Once)

```bash
cd apps/bio-internal

# 1. Backfill historical messages (last 14 days)
bun run discord:backfill 14

# This populates your database with existing messages
```

---

### Step 2: Enable Real-time Bot

Add to your production `.env`:

```bash
ENABLE_DISCORD_BOT=true
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id
OPENAI_API_KEY=your_openai_key
```

**Then restart your service:**

```bash
# Docker
docker-compose restart backend

# Coolify
# Redeploy the service from dashboard
```

**✅ Done!** The bot is now listening and saving messages in real-time.

---

### Step 3: Schedule Weekly Reports

#### Using Coolify (Recommended)

1. Go to your Coolify project
2. Click "Scheduled Tasks" or "Cron Jobs"
3. Add new task:
   - **Name:** Discord Weekly Reports
   - **Schedule:** `0 9 * * 1`
   - **Command:** `bun run discord:weekly-report`
   - **Container:** Select your `bio-internal` container

4. Save and test it!

#### Using Crontab (Linux/Mac)

```bash
crontab -e

# Add this line:
0 9 * * 1 cd /path/to/bio-dashboard-deployment/apps/bio-internal && bun run discord:weekly-report
```

---

### Step 4: Schedule Monthly Reports

Same as weekly, but use:
- **Schedule:** `0 10 1 * *`
- **Command:** `bun run discord:monthly-report`

---

## ✅ Verify It's Working

### Check Bot Status

```bash
docker logs bio-internal-backend | grep Discord

# You should see:
# ✅ Discord bot logged in as BioSyncAgent#1234
# 📡 Tracking 111 Discord channels for real-time sync
```

### Check Messages in Database

```bash
psql $SUPABASE_DB_URL -c "SELECT COUNT(*), MAX(posted_at) FROM discord_messages;"
```

### Test Report Generation

```bash
cd apps/bio-internal
bun run discord:weekly-report
```

---

## 📅 Schedule Summary

| Task | When | Cron | Command |
|------|------|------|---------|
| **Real-time Sync** | Always running | N/A | Automatic (bot) |
| **Weekly Reports** | Every Monday 9 AM UTC | `0 9 * * 1` | `discord:weekly-report` |
| **Monthly Reports** | 1st of month 10 AM UTC | `0 10 1 * *` | `discord:monthly-report` |

---

## 🎯 That's It!

You now have:
- ✅ Real-time message sync (bot running 24/7)
- ✅ Weekly AI reports (every Monday)
- ✅ Monthly AI reports (1st of every month)

All messages are automatically saved to Supabase as they happen! 🎉

---

## 📚 Need More Details?

See full documentation: `docs/DISCORD_PRODUCTION_SETUP.md`

