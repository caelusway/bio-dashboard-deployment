# Discord Channel Discovery - JSON Workflow

## 🎯 Overview

The discovery script now saves channel data to a **JSON file** for easy automation, reference, and mapping generation!

---

## 🚀 Quick Start

### Step 1: Discover Channels (Saves to JSON)

```bash
cd apps/bio-internal
bun run discord:discover
```

**Output:**
- ✅ Console: Human-readable structure
- ✅ **`discord-channels.json`**: Machine-readable data

### Step 2: Generate Mappings (Auto-generate code)

```bash
bun run discord:generate-mappings
```

**Output:**
- ✅ Ready-to-use TypeScript code
- ✅ Copy & paste into `discord-sync-and-report.ts`

### Step 3: Update DAO Slugs

Edit the generated code to match your database slugs.

### Step 4: Run Sync

```bash
bun run discord:sync
```

---

## 📄 JSON File Structure

### File Location
`apps/bio-internal/discord-channels.json`

### Structure

```json
{
  "guildId": "1234567890123456789",
  "guildName": "Bio Ecosystem",
  "discoveredAt": "2025-11-19T10:30:00.000Z",
  "categories": [
    {
      "categoryId": "1234567890123456790",
      "categoryName": "Molecule",
      "channels": [
        {
          "channelId": "1234567890123456791",
          "channelName": "molecule-general",
          "type": "text",
          "isForum": false,
          "position": 0
        },
        {
          "channelId": "1234567890123456792",
          "channelName": "molecule-topics",
          "type": "forum",
          "isForum": true,
          "position": 1
        }
      ]
    },
    {
      "categoryId": "1234567890123456793",
      "categoryName": "D1CkDAO",
      "channels": [
        {
          "channelId": "1234567890123456794",
          "channelName": "d1ckdao-general",
          "type": "text",
          "isForum": false,
          "position": 0
        },
        {
          "channelId": "1234567890123456795",
          "channelName": "d1ckdao-topics",
          "type": "forum",
          "isForum": true,
          "position": 1
        }
      ]
    }
  ],
  "uncategorized": []
}
```

---

## 🔧 Using the JSON File

### 1. Manual Reference

Open `discord-channels.json` to:
- ✅ See all channel IDs
- ✅ Identify forum channels
- ✅ Check category structure
- ✅ Verify channel names

### 2. Auto-Generate Mappings

```bash
bun run discord:generate-mappings
```

**Output Example:**
```typescript
const CHANNEL_MAPPINGS = [
  // ======================================================================
  // MOLECULE
  // Category: "Molecule"
  // ======================================================================
  {
    channelId: '1234567890123456791',
    daoSlug: 'molecule', // ⚠️ UPDATE to match your database!
    channelName: 'molecule-general',
    category: 'Molecule',
    isForum: false,
  },
  {
    channelId: '1234567890123456792',
    daoSlug: 'molecule', // ⚠️ UPDATE to match your database!
    channelName: 'molecule-topics',
    category: 'Molecule',
    isForum: true, // Forum - syncs all threads
  },
  
  // ======================================================================
  // D1CKDAO
  // Category: "D1CkDAO"
  // ======================================================================
  {
    channelId: '1234567890123456794',
    daoSlug: 'd1ckdao', // ⚠️ UPDATE to match your database!
    channelName: 'd1ckdao-general',
    category: 'D1CkDAO',
    isForum: false,
  },
  {
    channelId: '1234567890123456795',
    daoSlug: 'd1ckdao', // ⚠️ UPDATE to match your database!
    channelName: 'd1ckdao-topics',
    category: 'D1CkDAO',
    isForum: true, // Forum - syncs all threads
  },
];
```

### 3. Programmatic Access

```typescript
import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('discord-channels.json', 'utf-8'));

// Get all forum channels
const forumChannels = data.categories
  .flatMap(cat => cat.channels)
  .filter(ch => ch.isForum);

console.log(`Found ${forumChannels.length} forum channels`);

// Get channels by category
const moleculeChannels = data.categories
  .find(cat => cat.categoryName === 'Molecule')
  ?.channels || [];

console.log(`Molecule has ${moleculeChannels.length} channels`);
```

---

## 🔄 Workflow

### Initial Setup

```bash
# 1. Discover channels (creates JSON)
bun run discord:discover

# 2. Generate mappings from JSON
bun run discord:generate-mappings

# 3. Copy output to discord-sync-and-report.ts

# 4. Update daoSlug values to match database

# 5. Run sync
bun run discord:sync
```

### When Channels Change

```bash
# 1. Re-discover (updates JSON)
bun run discord:discover

# 2. Re-generate mappings
bun run discord:generate-mappings

# 3. Copy NEW channels to your mappings

# 4. Run sync
bun run discord:sync
```

---

## 📊 JSON Benefits

### 1. **Version Control**
- Track channel changes over time
- See when channels were added/removed
- Compare different server states

### 2. **Automation**
- Generate mappings automatically
- Build custom tools
- Integrate with other systems

### 3. **Documentation**
- Single source of truth
- Easy to share with team
- Reference for troubleshooting

### 4. **Validation**
- Check if channels exist
- Verify forum channels
- Validate mappings

---

## 🛠️ Advanced Usage

### Compare with Database

```typescript
import { db } from './src/db/client';
import { discordChannels } from './src/db/schema';

const jsonData = JSON.parse(readFileSync('discord-channels.json', 'utf-8'));
const dbChannels = await db.select().from(discordChannels);

// Find channels in Discord but not in database
const jsonChannelIds = jsonData.categories
  .flatMap(cat => cat.channels)
  .map(ch => ch.channelId);

const dbChannelIds = dbChannels.map(ch => ch.channelId);

const missing = jsonChannelIds.filter(id => !dbChannelIds.includes(id));
console.log(`${missing.length} channels not yet synced`);
```

### Generate Report

```typescript
const data = JSON.parse(readFileSync('discord-channels.json', 'utf-8'));

console.log('📊 Discord Server Report\n');
console.log(`Server: ${data.guildName}`);
console.log(`Discovered: ${new Date(data.discoveredAt).toLocaleString()}\n`);

for (const category of data.categories) {
  const forumCount = category.channels.filter(ch => ch.isForum).length;
  const textCount = category.channels.length - forumCount;
  
  console.log(`📂 ${category.categoryName}`);
  console.log(`   Total: ${category.channels.length} channels`);
  console.log(`   Text: ${textCount}, Forum: ${forumCount}`);
}
```

### Export to CSV

```typescript
import { writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('discord-channels.json', 'utf-8'));

const csv = ['Category,Channel Name,Channel ID,Type,Is Forum'];

for (const category of data.categories) {
  for (const channel of category.channels) {
    csv.push([
      category.categoryName,
      channel.channelName,
      channel.channelId,
      channel.type,
      channel.isForum
    ].join(','));
  }
}

writeFileSync('discord-channels.csv', csv.join('\n'), 'utf-8');
console.log('✅ Exported to discord-channels.csv');
```

---

## 🔐 Security

### .gitignore

The JSON file is automatically added to `.gitignore`:

```gitignore
# Discord discovery output
discord-channels.json
```

**Why?**
- Contains server-specific IDs
- May reveal server structure
- Should be regenerated per environment

### Sharing

If you need to share channel structure:
1. Remove sensitive channel IDs
2. Keep only channel names and structure
3. Share the sanitized version

---

## 📝 Example Output

### Console Output

```
📋 Discovering channels...
================================================================================

📁 DISCORD SERVER STRUCTURE

📂 Category: MOLECULE
   Category ID: 1234567890123456790
   ──────────────────────────────────────────────────────────────────────
   📄 molecule-general
      Channel ID: 1234567890123456791
   💬 molecule-topics [FORUM - Topics]
      Channel ID: 1234567890123456792
      ⚠️  Forum channel - will sync all topic threads
   📄 molecule-design
      Channel ID: 1234567890123456793

📂 Category: D1CKDAO
   Category ID: 1234567890123456794
   ──────────────────────────────────────────────────────────────────────
   📄 d1ckdao-general
      Channel ID: 1234567890123456795
   💬 d1ckdao-topics [FORUM - Topics]
      Channel ID: 1234567890123456796
      ⚠️  Forum channel - will sync all topic threads

================================================================================

✅ Channel data saved to: /path/to/discord-channels.json

📊 SUMMARY:

   Total Categories: 2
   Total Channels: 5
   Forum Channels: 2
   Text Channels: 3
   Uncategorized: 0
```

### JSON File Content

See structure example above ☝️

---

## 🎯 Best Practices

### 1. **Regular Discovery**
Run discovery weekly to catch new channels:
```bash
# Add to cron
0 9 * * 1 cd /path/to/bio-internal && bun run discord:discover
```

### 2. **Version Control**
Commit a sanitized version (without IDs) for documentation:
```bash
# Create sanitized version
cat discord-channels.json | jq 'del(.categories[].channels[].channelId)' > discord-structure.json
git add discord-structure.json
```

### 3. **Validation**
Compare JSON with database regularly:
```bash
# Check for missing channels
bun run scripts/validate-channels.ts
```

### 4. **Documentation**
Keep JSON file as reference for:
- Onboarding new team members
- Troubleshooting sync issues
- Planning channel changes

---

## ✅ Quick Reference

| Command | Purpose |
|---------|---------|
| `bun run discord:discover` | Scan server, create JSON |
| `bun run discord:generate-mappings` | Generate code from JSON |
| `cat discord-channels.json` | View JSON file |
| `cat discord-channels.json \| jq` | Pretty-print JSON |

---

## 🎉 Summary

**The JSON workflow makes Discord integration:**
- ✅ **Faster** - Auto-generate mappings
- ✅ **Easier** - No manual ID copying
- ✅ **Safer** - Validate before syncing
- ✅ **Documented** - Single source of truth

**Your Discord channel management is now automated! 🚀**

