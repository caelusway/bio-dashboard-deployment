# Discord Integration for Bio Ecosystem

## Overview

BioSyncAgent is an internal AI-powered Discord bot that automates the collection and reporting of key data from the Bio Ecosystem Discord server. It generates weekly and monthly reports to help the internal team monitor activity across projects.

## Features

- ✅ **Channel Sync**: Automatically sync Discord channels to database
- ✅ **Message Collection**: Collect and store messages from all project channels
- ✅ **Historical Backfill**: Backfill messages from the last 7-30 days
- ✅ **AI-Powered Reports**: Generate insightful weekly and monthly reports using OpenAI
- ✅ **DAO Mapping**: Map Discord channels to specific DAO entities
- ✅ **Statistics Tracking**: Track message counts, contributors, and engagement

## Database Schema

### Tables

1. **discord_channels**
   - Stores Discord channel information
   - Links channels to DAO entities
   - Tracks last sync timestamp

2. **discord_messages**
   - Stores individual Discord messages
   - Includes content, author, attachments, embeds
   - Indexed by channel and posted date

3. **discord_reports**
   - Stores generated reports (weekly/monthly)
   - Includes AI-generated summaries
   - Links to specific channels

## Setup

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Enable these **Privileged Gateway Intents**:
   - ✅ SERVER MEMBERS INTENT
   - ✅ MESSAGE CONTENT INTENT
5. Copy the bot token

### 2. Invite Bot to Server

Use this URL (replace `YOUR_CLIENT_ID`):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=68608&scope=bot
```

Required permissions:
- Read Messages/View Channels
- Read Message History

### 3. Get Guild ID

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your server → Copy Server ID

### 4. Get Channel IDs

1. Right-click each channel → Copy Channel ID
2. Update `CHANNEL_MAPPINGS` in `scripts/discord-sync-and-report.ts`

### 5. Environment Variables

Add to your `.env` file:

```bash
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here

# OpenAI API (for report generation)
OPENAI_API_KEY=your_openai_api_key_here
```

### 6. Apply Database Migration

```bash
cd apps/bio-internal
bun run drizzle:migrate
```

Or manually apply the migration:
```bash
psql $SUPABASE_DB_URL -f drizzle/0008_add_discord_tables.sql
```

## Usage

### Channel Mapping

Update the `CHANNEL_MAPPINGS` in `scripts/discord-sync-and-report.ts`:

```typescript
const CHANNEL_MAPPINGS = [
  {
    channelId: '1234567890123456789', // Discord channel ID
    daoSlug: 'molecule',              // DAO slug from database
    channelName: 'molecule-general',  // Friendly name
  },
  // Add more channels...
];
```

### Run Sync and Generate Reports

```bash
cd apps/bio-internal
bun run scripts/discord-sync-and-report.ts
```

This will:
1. ✅ Sync all configured channels to database
2. ✅ Backfill last 7 days of messages
3. ✅ Generate weekly reports for each channel

### Generate Reports Only

```typescript
import { DiscordReportService } from './src/services/discord';

const reportService = new DiscordReportService(process.env.OPENAI_API_KEY!);

// Generate weekly report
const weeklyReport = await reportService.generateWeeklyReport('channel_id_here');

// Generate monthly report
const monthlyReport = await reportService.generateMonthlyReport('channel_id_here');
```

### Sync Messages Only

```typescript
import { DiscordSyncService } from './src/services/discord';

const syncService = new DiscordSyncService(
  process.env.DISCORD_BOT_TOKEN!,
  process.env.DISCORD_GUILD_ID!
);

// Sync specific channel (last 7 days)
await syncService.syncChannelMessages('channel_id', { daysBack: 7 });

// Sync all channels
await syncService.syncAll(CHANNEL_MAPPINGS, 7);
```

## Report Structure

Generated reports include:

### 📊 Key Metrics
- Total messages
- Unique contributors
- Average messages per day
- Messages with attachments

### 👥 Top Contributors
- Top 10 most active users
- Message counts per user

### 🔑 Key Topics
- Extracted keywords and topics
- Discussion themes

### 🤖 AI-Generated Summary
- Overall activity trends
- Key discussion topics
- Notable contributions
- Community engagement insights
- Recommendations for the team

## Automation

### Scheduled Sync (Recommended)

Add to your cron jobs or deployment scheduler:

```bash
# Daily sync at 2 AM
0 2 * * * cd /path/to/bio-internal && bun run scripts/discord-sync-and-report.ts

# Weekly report generation (Monday 9 AM)
0 9 * * 1 cd /path/to/bio-internal && bun run scripts/discord-sync-and-report.ts
```

### Continuous Sync Job

Create a job that runs periodically:

```typescript
// src/jobs/discordSync.ts
import { DiscordSyncService } from '../services/discord';

export async function runDiscordSync() {
  const syncService = new DiscordSyncService(
    process.env.DISCORD_BOT_TOKEN!,
    process.env.DISCORD_GUILD_ID!
  );

  try {
    await syncService.syncAll(CHANNEL_MAPPINGS, 1); // Sync last 1 day
    console.log('✅ Discord sync completed');
  } catch (error) {
    console.error('❌ Discord sync failed:', error);
  } finally {
    await syncService.destroy();
  }
}

// Run every hour
setInterval(runDiscordSync, 60 * 60 * 1000);
```

## API Endpoints (Optional)

You can add REST endpoints to trigger syncs and generate reports:

```typescript
// src/routes/discord.ts
import { Elysia } from 'elysia';
import { DiscordSyncService, DiscordReportService } from '../services/discord';

export const discordRoutes = new Elysia({ prefix: '/discord' })
  .post('/sync/:channelId', async ({ params }) => {
    const syncService = new DiscordSyncService(
      process.env.DISCORD_BOT_TOKEN!,
      process.env.DISCORD_GUILD_ID!
    );
    
    const result = await syncService.syncChannelMessages(params.channelId);
    await syncService.destroy();
    
    return result;
  })
  .post('/report/:channelId/weekly', async ({ params }) => {
    const reportService = new DiscordReportService(process.env.OPENAI_API_KEY!);
    const report = await reportService.generateWeeklyReport(params.channelId);
    return { report };
  })
  .get('/reports/:channelId', async ({ params }) => {
    const reportService = new DiscordReportService(process.env.OPENAI_API_KEY!);
    const reports = await reportService.getReports(params.channelId);
    return reports;
  });
```

## Troubleshooting

### Bot Can't Read Messages
- Ensure bot has "Read Message History" permission
- Enable "Message Content Intent" in Discord Developer Portal
- Re-invite bot with correct permissions

### Missing Messages
- Check bot was added before messages were sent
- Increase `daysBack` parameter for backfill
- Verify channel IDs are correct

### AI Summary Failed
- Check OpenAI API key is valid
- Verify you have API credits
- Check rate limits

### Channel Not Found
- Run `syncChannels` before syncing messages
- Verify channel ID is correct
- Check DAO slug exists in database

## Cost Estimation

### OpenAI API Costs
- Using GPT-4o-mini (~$0.15 per 1M input tokens)
- Average report: ~2,000 tokens input, ~500 tokens output
- Cost per report: ~$0.0004
- 50 channels × weekly reports = ~$0.02/week = ~$1/year

Very affordable! 🎉

## Best Practices

1. **Start Small**: Begin with 2-3 channels for testing
2. **Backfill Gradually**: Start with 7 days, then increase if needed
3. **Monitor Costs**: Track OpenAI API usage
4. **Rate Limits**: Discord has rate limits, the service handles this automatically
5. **Regular Syncs**: Run daily syncs to keep data fresh
6. **Archive Reports**: Store reports in database for historical analysis

## Future Enhancements

- [ ] Real-time message streaming
- [ ] Sentiment analysis
- [ ] User engagement scoring
- [ ] Automated alerts for low activity
- [ ] Dashboard integration
- [ ] Thread support
- [ ] Reaction tracking
- [ ] Voice channel activity tracking

## Support

For issues or questions, contact the Bio internal team.

