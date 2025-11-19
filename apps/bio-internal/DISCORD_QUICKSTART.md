# Discord Integration - Quick Start

## 🚀 Get Started in 5 Minutes

### 1. Create Discord Bot (2 min)
1. Go to https://discord.com/developers/applications
2. Create new application → Add Bot
3. Enable "Message Content Intent" in Bot settings
4. Copy bot token
5. Invite bot: `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=68608&scope=bot`

### 2. Get IDs (1 min)
1. Enable Developer Mode in Discord (Settings → Advanced)
2. Right-click server → Copy Server ID
3. Right-click channels → Copy Channel IDs

### 3. Get OpenAI Key (1 min)
1. Go to https://platform.openai.com/
2. Create API key
3. Add $5 credits (lasts months)

### 4. Configure (1 min)
Add to `apps/bio-internal/.env`:
```bash
DISCORD_BOT_TOKEN=your_token_here
DISCORD_GUILD_ID=your_guild_id_here
OPENAI_API_KEY=your_openai_key_here
```

Update channel mappings in `scripts/discord-sync-and-report.ts`:
```typescript
const CHANNEL_MAPPINGS = [
  {
    channelId: 'YOUR_CHANNEL_ID',
    daoSlug: 'molecule', // Must match database
    channelName: 'molecule-general',
  },
  // Add more...
];
```

### 5. Run! (30 sec)
```bash
cd apps/bio-internal

# Apply migration
bun run drizzle:migrate

# Run sync and generate reports
bun run discord:sync
```

## 📊 What Happens

1. ✅ Syncs channels to database
2. ✅ Backfills last 7 days of messages
3. ✅ Generates AI-powered weekly reports
4. ✅ Prints reports to console
5. ✅ Saves everything to Supabase

## 📚 Full Documentation

- **Setup Guide:** `docs/DISCORD_INTEGRATION_SETUP.md`
- **Summary:** `docs/DISCORD_INTEGRATION_SUMMARY.md`
- **Technical Docs:** `src/services/discord/README.md`

## 🆘 Issues?

Check troubleshooting in `docs/DISCORD_INTEGRATION_SETUP.md`

---

**That's it! You're ready to sync! 🎉**

