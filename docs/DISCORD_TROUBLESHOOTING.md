# Discord Integration Troubleshooting

## ❌ Common Errors

### Error: "Channel not found in database"

**Full Error:**
```
error: Channel 1234567890123456789 not found in database. Run syncChannels first.
```

**Cause:**
You're using **placeholder channel IDs** instead of real Discord channel IDs!

**Solution:**

#### Step 1: Run Discovery Script
```bash
cd apps/bio-internal
bun run discord:discover
```

This will show your **real channel IDs**:
```
📂 Category: MOLECULE
   📄 molecule-general
      Channel ID: 9876543210987654321  ← REAL ID
   💬 molecule-topics [FORUM]
      Channel ID: 1357924680135792468  ← REAL ID
```

#### Step 2: Update Your Script

Edit `scripts/discord-backfill-messages.ts` and replace placeholder IDs:

**❌ WRONG (Placeholder IDs):**
```typescript
const CHANNEL_MAPPINGS = [
  {
    channelId: '1234567890123456789', // ← PLACEHOLDER!
    daoSlug: 'molecule',
    channelName: 'molecule-general',
  },
];
```

**✅ CORRECT (Real IDs from discovery):**
```typescript
const CHANNEL_MAPPINGS = [
  {
    channelId: '9876543210987654321', // ← REAL ID from discovery
    daoSlug: 'molecule',
    channelName: 'molecule-general',
  },
];
```

#### Step 3: Use Generate Mappings (Easier!)

```bash
# This automatically generates correct mappings
bun run discord:generate-mappings

# Copy the output to your script
```

---

### Error: "Discord bot not logged in"

**Cause:**
`DISCORD_BOT_TOKEN` is missing or invalid.

**Solution:**
1. Check `.env` file has `DISCORD_BOT_TOKEN=your_token_here`
2. Verify token is correct (no quotes, no spaces)
3. Check bot is created in Discord Developer Portal

---

### Error: "Missing DISCORD_GUILD_ID"

**Cause:**
`DISCORD_GUILD_ID` environment variable not set.

**Solution:**
1. Enable Developer Mode in Discord (Settings → Advanced)
2. Right-click your server → Copy Server ID
3. Add to `.env`: `DISCORD_GUILD_ID=your_guild_id_here`

---

### Error: "Channel is not a text channel"

**Cause:**
Trying to sync a voice channel or other non-text channel.

**Solution:**
1. Run discovery script to see channel types
2. Only sync text channels and forum channels
3. Remove voice/stage channels from mappings

---

### Error: "OpenAI API error: 401"

**Cause:**
Invalid or missing OpenAI API key.

**Solution:**
1. Check `.env` has `OPENAI_API_KEY=sk-...`
2. Verify key is valid at platform.openai.com
3. Check you have API credits

---

### Error: "No messages in period"

**Cause:**
No messages found in the specified time range.

**Solution:**
1. Check bot joined server before the messages were sent
2. Increase backfill days: `bun run discord:backfill 30`
3. Verify messages exist in Discord channel
4. Check bot has "Read Message History" permission

---

## 🔍 Debugging Steps

### 1. Verify Environment Variables

```bash
cd apps/bio-internal

# Check all required vars are set
echo "DISCORD_BOT_TOKEN: ${DISCORD_BOT_TOKEN:0:10}..."
echo "DISCORD_GUILD_ID: $DISCORD_GUILD_ID"
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..."
```

### 2. Test Database Connection

```bash
psql $SUPABASE_DB_URL -c "SELECT COUNT(*) FROM discord_channels;"
```

### 3. Check Channel IDs

```bash
# Run discovery to see real IDs
bun run discord:discover

# Check what's in your script
grep "channelId:" scripts/discord-backfill-messages.ts
```

### 4. Verify Bot Permissions

In Discord:
1. Go to Server Settings → Roles
2. Find your bot's role
3. Ensure it has:
   - ✅ View Channels
   - ✅ Read Message History
   - ✅ Read Messages/View Channels

### 5. Check Database Migrations

```bash
# Verify tables exist
psql $SUPABASE_DB_URL -c "\dt discord*"

# Should show:
# discord_channels
# discord_messages
# discord_reports
```

---

## 💡 Quick Fixes

### "I just want it to work!"

```bash
cd apps/bio-internal

# 1. Discover (get real IDs)
bun run discord:discover

# 2. Generate mappings (auto-create code)
bun run discord:generate-mappings

# 3. Copy output to discord-backfill-messages.ts
#    Replace the CHANNEL_MAPPINGS array

# 4. Update daoSlug values to match your database
psql $SUPABASE_DB_URL -c "SELECT slug FROM dao_entities;"

# 5. Run backfill
bun run discord:backfill
```

---

## 📋 Checklist

Before running backfill, verify:

- [ ] `.env` has `DISCORD_BOT_TOKEN`
- [ ] `.env` has `DISCORD_GUILD_ID`
- [ ] `.env` has `OPENAI_API_KEY` (for reports)
- [ ] Bot is invited to Discord server
- [ ] Bot has correct permissions
- [ ] Ran `discord:discover` to get real channel IDs
- [ ] Updated `CHANNEL_MAPPINGS` with real IDs
- [ ] Updated `daoSlug` values to match database
- [ ] Database migrations applied (tables exist)

---

## 🆘 Still Having Issues?

### Check Logs

```bash
# Run with verbose output
DISCORD_BOT_TOKEN=xxx DISCORD_GUILD_ID=xxx bun run discord:backfill 2>&1 | tee discord-debug.log
```

### Verify Channel Exists

```bash
# After running syncChannels, check database
psql $SUPABASE_DB_URL -c "
  SELECT channel_id, name, dao_id 
  FROM discord_channels 
  WHERE channel_id = 'YOUR_CHANNEL_ID';
"
```

### Test Single Channel

Edit `discord-backfill-messages.ts` to test with just one channel:

```typescript
const CHANNEL_MAPPINGS = [
  {
    channelId: 'YOUR_REAL_CHANNEL_ID', // Just one for testing
    daoSlug: 'molecule',
    channelName: 'test-channel',
    category: 'Test',
    isForum: false,
  },
];
```

---

## ✅ Success Indicators

You'll know it's working when you see:

```
✅ Discord bot logged in as BioSyncAgent#1234
✅ Synced channel: molecule-general (9876543210987654321)
✅ molecule-general: 245 messages
```

**NOT placeholder IDs like `1234567890123456789`!**

