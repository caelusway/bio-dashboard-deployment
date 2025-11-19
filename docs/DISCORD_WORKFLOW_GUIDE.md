# Discord Integration - Complete Workflow Guide

## 🎯 Overview

The Discord integration has **two separate phases**:

1. **📥 Message Backfill** - Sync historical messages to database
2. **📊 Report Generation** - Generate AI-powered reports from synced messages

This separation allows you to:
- ✅ Backfill large amounts of historical data without waiting for AI
- ✅ Generate reports on-demand without re-syncing messages
- ✅ Re-generate reports with different parameters
- ✅ Control costs (AI only runs when generating reports)

---

## 🚀 Quick Start

### Initial Setup (One Time)

```bash
cd apps/bio-internal

# 1. Discover your Discord server structure
bun run discord:discover

# 2. Generate channel mappings
bun run discord:generate-mappings

# 3. Copy mappings to discord-backfill-messages.ts

# 4. Backfill last 14 days of messages
bun run discord:backfill

# 5. Generate weekly reports
bun run discord:generate-reports weekly
```

---

## 📋 Detailed Workflow

### Phase 1: Message Backfill

#### Step 1: Discover Channels

```bash
bun run discord:discover
```

**What it does:**
- Scans your Discord server
- Lists all channels organized by category
- Identifies forum channels
- Saves to `discord-channels.json`

**Output:**
```
📂 Category: MOLECULE
   📄 molecule-general (ID: 123...)
   💬 molecule-topics [FORUM] (ID: 124...)

📂 Category: D1CKDAO
   📄 d1ckdao-general (ID: 125...)
   💬 d1ckdao-topics [FORUM] (ID: 126...)

✅ Channel data saved to: discord-channels.json
```

#### Step 2: Generate Mappings

```bash
bun run discord:generate-mappings
```

**What it does:**
- Reads `discord-channels.json`
- Generates TypeScript mapping code
- Suggests DAO slug mappings

**Output:**
```typescript
const CHANNEL_MAPPINGS = [
  {
    channelId: '123...',
    daoSlug: 'molecule',
    channelName: 'molecule-general',
    category: 'Molecule',
    isForum: false,
  },
  // ... all channels
];
```

#### Step 3: Update Backfill Script

Edit `scripts/discord-backfill-messages.ts`:

1. Copy the generated `CHANNEL_MAPPINGS`
2. Update `daoSlug` values to match your database
3. Save the file

#### Step 4: Run Backfill

```bash
# Backfill last 14 days (default)
bun run discord:backfill

# Or specify custom days
bun run discord:backfill 30  # Last 30 days
bun run discord:backfill 7   # Last 7 days
```

**What it does:**
- Syncs all channels to database
- Backfills messages from last N days
- Handles forum channels (syncs all threads)
- Shows progress for each channel

**Output:**
```
🚀 Starting Discord Message Backfill...
📅 Backfilling last 14 days of messages

📡 Step 1: Syncing channels to database...
✅ Synced channel: molecule-general
✅ Synced channel: molecule-topics
...

📥 Step 2: Backfilling messages...
[1/24] 📥 Syncing: molecule-general...
[1/24] ✅ molecule-general: 245 messages

[2/24] 📥 Syncing: molecule-topics...
💬 Syncing forum channel (including all topics/threads)...
📊 Found 15 threads (8 active, 7 archived)
[2/24] ✅ molecule-topics: 389 messages (15 threads)

...

📊 BACKFILL SUMMARY
   Channels Processed: 24
   ✅ Successful: 24
   ❌ Failed: 0
   📨 Total Messages Synced: 5,234
   📅 Days Backfilled: 14

✅ Message backfill completed!
```

#### Step 5: Verify Data

```bash
# Check total messages
psql $SUPABASE_DB_URL -c "SELECT COUNT(*) FROM discord_messages;"

# Check messages per channel
psql $SUPABASE_DB_URL -c "
  SELECT 
    dc.name,
    COUNT(dm.id) as message_count
  FROM discord_channels dc
  LEFT JOIN discord_messages dm ON dc.id = dm.channel_id
  GROUP BY dc.name
  ORDER BY message_count DESC;
"
```

---

### Phase 2: Report Generation

#### Step 1: Generate Reports

```bash
# Generate weekly reports (last 7 days)
bun run discord:generate-reports weekly

# Or generate monthly reports (last 30 days)
bun run discord:generate-reports monthly
```

**What it does:**
- Fetches all channels from database
- For each channel, analyzes messages
- Uses AI to extract action items, decisions, risks
- Generates comprehensive reports
- Saves reports to database

**Output:**
```
🚀 Starting Discord Report Generation...
📊 Generating weekly reports

📡 Fetching channels from database...
✅ Found 24 channels

📊 Generating weekly reports...

[1/24] 📝 Generating report for: molecule-general...
[1/24] ✅ Report generated for: molecule-general

────────────────────────────────────────────────────────────────────────────────
# Weekly Report: molecule-general
**DAO/Project:** Molecule  
**Sentiment:** 🟢 POSITIVE  
**Engagement:** 🔥 HIGH

## 📋 Executive Summary
Strong week with significant progress on API development...
────────────────────────────────────────────────────────────────────────────────

[2/24] 📝 Generating report for: molecule-topics...
[2/24] ✅ Report generated for: molecule-topics
...

📊 REPORT GENERATION SUMMARY
   Total Channels: 24
   ✅ Reports Generated: 22
   ⏭️  Skipped (No Data): 2
   ❌ Failed: 0

✅ Report generation completed!
```

#### Step 2: View Reports

**In Database:**
```bash
# View latest reports
psql $SUPABASE_DB_URL -c "
  SELECT 
    dr.report_type,
    dc.name as channel,
    dr.period_start,
    dr.period_end,
    dr.created_at
  FROM discord_reports dr
  JOIN discord_channels dc ON dr.channel_id = dc.id
  ORDER BY dr.created_at DESC
  LIMIT 10;
"

# View specific report content
psql $SUPABASE_DB_URL -c "
  SELECT content 
  FROM discord_reports 
  WHERE report_type = 'weekly' 
  ORDER BY created_at DESC 
  LIMIT 1;
"
```

**Export to File:**
```bash
# Export latest weekly report
psql $SUPABASE_DB_URL -t -c "
  SELECT content 
  FROM discord_reports 
  WHERE report_type = 'weekly' 
  ORDER BY created_at DESC 
  LIMIT 1;
" > latest-weekly-report.md

# View in terminal
cat latest-weekly-report.md
```

---

## 🔄 Regular Operations

### Daily Sync (Recommended)

```bash
# Backfill last 1 day of new messages
bun run discord:backfill 1
```

**Schedule with cron:**
```bash
# Daily at 2 AM - sync yesterday's messages
0 2 * * * cd /path/to/bio-internal && bun run discord:backfill 1
```

### Weekly Reports

```bash
# Generate weekly reports every Monday
bun run discord:generate-reports weekly
```

**Schedule with cron:**
```bash
# Every Monday at 9 AM
0 9 * * 1 cd /path/to/bio-internal && bun run discord:generate-reports weekly
```

### Monthly Reports

```bash
# Generate monthly reports on 1st of month
bun run discord:generate-reports monthly
```

**Schedule with cron:**
```bash
# 1st of every month at 9 AM
0 9 1 * * cd /path/to/bio-internal && bun run discord:generate-reports monthly
```

---

## 📊 Complete Automation Example

### Crontab Setup

```bash
# Edit crontab
crontab -e

# Add these lines:

# Daily message sync at 2 AM
0 2 * * * cd /path/to/bio-internal && bun run discord:backfill 1 >> /tmp/discord-sync.log 2>&1

# Weekly reports every Monday at 9 AM
0 9 * * 1 cd /path/to/bio-internal && bun run discord:generate-reports weekly >> /tmp/discord-reports.log 2>&1

# Monthly reports on 1st at 10 AM
0 10 1 * * cd /path/to/bio-internal && bun run discord:generate-reports monthly >> /tmp/discord-reports.log 2>&1
```

---

## 🎯 Use Cases

### Initial Historical Analysis

```bash
# Backfill last 90 days
bun run discord:backfill 90

# Generate monthly reports for historical view
bun run discord:generate-reports monthly
```

### Weekly Team Updates

```bash
# Every Monday morning:
# 1. Sync last week's messages
bun run discord:backfill 7

# 2. Generate weekly reports
bun run discord:generate-reports weekly

# 3. Email reports to team (custom script)
bun run scripts/email-reports.ts
```

### On-Demand Analysis

```bash
# Sync recent messages
bun run discord:backfill 3

# Generate fresh reports
bun run discord:generate-reports weekly

# Query specific insights
psql $SUPABASE_DB_URL -c "
  SELECT 
    metadata->'analysis'->>'actionItemsPending' as pending_items,
    metadata->'analysis'->>'sentiment' as sentiment
  FROM discord_reports
  WHERE report_type = 'weekly'
  ORDER BY created_at DESC;
"
```

---

## 💰 Cost Management

### Message Backfill
- **Cost**: FREE (Discord API)
- **Time**: ~1-2 seconds per channel
- **Frequency**: Daily recommended

### Report Generation
- **Cost**: ~$0.002 per report (GPT-4o)
- **Time**: ~3-5 seconds per report
- **Frequency**: Weekly/Monthly recommended

### Cost Example

**50 channels:**
- Daily backfill: FREE
- Weekly reports: 50 × $0.002 = $0.10/week = **$5/year**
- Monthly reports: 50 × $0.002 = $0.10/month = **$1.20/year**

**Total: ~$6/year for 50 channels!** 🎉

---

## 🔧 Troubleshooting

### No Messages Synced

**Problem**: Backfill shows 0 messages

**Solutions:**
1. Check bot has "Read Message History" permission
2. Verify channel IDs are correct
3. Bot can only read messages sent AFTER it joined
4. Check date range (messages older than specified days)

### Report Generation Fails

**Problem**: "No messages in period" error

**Solutions:**
1. Run backfill first
2. Check messages exist in database
3. Verify date range overlaps with synced messages
4. Try longer time period (monthly instead of weekly)

### OpenAI API Errors

**Problem**: AI analysis fails

**Solutions:**
1. Verify OpenAI API key is valid
2. Check API credits available
3. Verify network connectivity
4. Check rate limits (wait and retry)

### Database Connection Issues

**Problem**: Can't connect to database

**Solutions:**
1. Verify `SUPABASE_DB_URL` is set
2. Check database is accessible
3. Verify migrations are applied
4. Check network/firewall settings

---

## 📚 Command Reference

| Command | Purpose | Frequency |
|---------|---------|-----------|
| `discord:discover` | Scan Discord server | Once / When channels change |
| `discord:generate-mappings` | Generate mapping code | Once / When channels change |
| `discord:backfill [days]` | Sync messages | Daily (1 day) / Initial (14-30 days) |
| `discord:generate-reports [type]` | Generate AI reports | Weekly / Monthly |
| `discord:sync` | Legacy: Sync + Report | Not recommended (use separate commands) |

---

## ✅ Best Practices

### 1. Separate Concerns
- ✅ Backfill messages daily
- ✅ Generate reports weekly/monthly
- ✅ Don't combine (keeps costs low)

### 2. Start Small
- ✅ Initial backfill: 14 days
- ✅ Test with 2-3 channels first
- ✅ Expand after validation

### 3. Monitor Costs
- ✅ Track OpenAI API usage
- ✅ Generate reports only when needed
- ✅ Use weekly reports primarily

### 4. Automate Wisely
- ✅ Daily message sync (free)
- ✅ Weekly reports (low cost)
- ✅ Monthly reports (optional)

### 5. Validate Data
- ✅ Check message counts after backfill
- ✅ Review first few reports manually
- ✅ Verify action items are accurate

---

## 🎉 Summary

**Two-Phase Workflow:**

1. **📥 Backfill** - Sync messages (fast, free, daily)
2. **📊 Reports** - Generate AI analysis (slow, paid, weekly)

**Benefits:**
- ✅ Faster backfills (no AI wait)
- ✅ Lower costs (AI only when needed)
- ✅ Flexible reporting (re-generate anytime)
- ✅ Better control (separate concerns)

**Your Discord intelligence is now production-ready! 🚀**

