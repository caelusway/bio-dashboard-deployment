# Discord Forum Channels Guide

## 📋 What are Forum Channels?

Forum channels (also called "Topics" channels) are a special type of Discord channel where:
- Each post creates a **new thread/topic**
- Discussions are organized by topic
- Great for structured conversations
- Common names: `molecule-topics`, `d1ckdao-topics`, etc.

**Visual Example:**
```
💬 molecule-topics [FORUM]
  ├── 🧵 "Research Update - Week 12"
  ├── 🧵 "Funding Proposal Discussion"
  ├── 🧵 "Community Feedback"
  └── 🧵 "Technical Questions"
```

---

## 🔍 Identifying Forum Channels

### Method 1: Discovery Script

Run the discovery script - forum channels are marked with `[FORUM - Topics]`:

```bash
cd apps/bio-internal
bun run discord:discover
```

**Output:**
```
📂 Category: MOLECULE
   ────────────────────────────────────────
   📄 molecule-general
      Channel ID: 1234567890123456790
   💬 molecule-topics [FORUM - Topics]
      Channel ID: 1234567890123456791
      ⚠️  Forum channel - will sync all topic threads
   📄 molecule-design
      Channel ID: 1234567890123456792
```

### Method 2: Discord UI

In Discord, forum channels have:
- 💬 Icon (speech bubble) instead of # hashtag
- "Create Post" button instead of message box
- List of threads/topics instead of messages

---

## ⚙️ How Forum Sync Works

### Regular Text Channel
```
molecule-general [TEXT]
  └── Messages: 1, 2, 3, 4, 5...
```
**Sync:** Fetches all messages directly

### Forum Channel
```
molecule-topics [FORUM]
  ├── Thread: "Research Update"
  │   └── Messages: 1, 2, 3...
  ├── Thread: "Funding Proposal"
  │   └── Messages: 1, 2, 3...
  └── Thread: "Community Feedback"
      └── Messages: 1, 2, 3...
```
**Sync:** 
1. Fetches all threads (active + archived)
2. For each thread, fetches all messages
3. Stores all messages linked to the forum channel

---

## 🛠️ Configuration

### Step 1: Identify Forum Channels

Run discovery script and note which channels are marked `[FORUM - Topics]`.

### Step 2: Update Channel Mappings

In `apps/bio-internal/scripts/discord-sync-and-report.ts`:

```typescript
const CHANNEL_MAPPINGS = [
  // Regular text channel
  {
    channelId: '1234567890123456790',
    daoSlug: 'molecule',
    channelName: 'molecule-general',
    category: 'Molecule',
    isForum: false, // ← Regular channel
  },
  
  // Forum channel (topics)
  {
    channelId: '1234567890123456791',
    daoSlug: 'molecule',
    channelName: 'molecule-topics',
    category: 'Molecule',
    isForum: true, // ← FORUM CHANNEL - syncs all threads
  },
];
```

### Key Field: `isForum`

- `isForum: false` - Regular text channel (default)
- `isForum: true` - Forum channel (syncs all threads)

---

## 🚀 Running Sync with Forum Channels

```bash
cd apps/bio-internal
bun run discord:sync
```

**Output for Forum Channels:**
```
📥 Syncing messages from channel 1234567890123456791 (last 7 days)...
💬 Syncing forum channel 1234567890123456791 (including all topics/threads)...
📊 Found 15 threads (8 active, 7 archived)
  📝 Syncing thread: Research Update - Week 12 (1234567890123456792)
  📝 Syncing thread: Funding Proposal Discussion (1234567890123456793)
  📝 Syncing thread: Community Feedback (1234567890123456794)
  ...
✅ Forum sync complete: 234 messages synced, 12 skipped
```

---

## 📊 Data Structure

### How Messages are Stored

All messages from forum threads are stored in `discord_messages` table, linked to the **parent forum channel**:

```sql
SELECT 
  dc.name as channel,
  dm.author_username,
  dm.content,
  dm.posted_at
FROM discord_messages dm
JOIN discord_channels dc ON dm.channel_id = dc.id
WHERE dc.name = 'molecule-topics'
ORDER BY dm.posted_at DESC
LIMIT 10;
```

**Result:**
```
   channel       | author_username |         content          |      posted_at
-----------------+-----------------+--------------------------+---------------------
 molecule-topics | alice           | Great research update!   | 2025-11-18 14:23:00
 molecule-topics | bob             | I agree with the proposal| 2025-11-18 13:45:00
 molecule-topics | charlie         | Can we discuss funding?  | 2025-11-17 16:30:00
```

### Thread Information

Thread metadata is stored in the message's context. You can identify which thread a message belongs to by checking Discord's thread structure.

---

## 🎯 Use Cases

### 1. **Topic-Based Discussions**
```
molecule-topics [FORUM]
  ├── "Weekly Research Updates"
  ├── "Grant Applications"
  ├── "Technical Questions"
  └── "Community Proposals"
```

**Benefit:** Organized discussions by topic, all synced automatically

### 2. **Meeting Notes**
```
d1ckdao-meeting-room [FORUM]
  ├── "Meeting Notes - Nov 15"
  ├── "Meeting Notes - Nov 8"
  └── "Meeting Notes - Nov 1"
```

**Benefit:** Historical meeting records, searchable and analyzable

### 3. **Design Reviews**
```
nootropics-design [FORUM]
  ├── "Logo Design Feedback"
  ├── "Website Mockups"
  └── "Brand Guidelines"
```

**Benefit:** Design discussions preserved with context

---

## 📈 Reporting on Forum Channels

### Messages per Thread (Conceptual)

While messages are stored flat, you can analyze activity:

```sql
-- Total activity in forum channel
SELECT 
  dc.name as forum_channel,
  COUNT(dm.id) as total_messages,
  COUNT(DISTINCT dm.author_id) as unique_contributors,
  MIN(dm.posted_at) as first_message,
  MAX(dm.posted_at) as last_message
FROM discord_channels dc
JOIN discord_messages dm ON dc.id = dm.channel_id
WHERE dc.name = 'molecule-topics'
  AND dm.posted_at >= NOW() - INTERVAL '7 days'
GROUP BY dc.name;
```

### Compare Forum vs Text Channels

```sql
SELECT 
  dc.name as channel,
  CASE 
    WHEN dc.type = 'forum' THEN 'Forum (Topics)'
    ELSE 'Text Channel'
  END as channel_type,
  COUNT(dm.id) as messages,
  COUNT(DISTINCT dm.author_id) as contributors
FROM discord_channels dc
LEFT JOIN discord_messages dm ON dc.id = dm.channel_id
WHERE dm.posted_at >= NOW() - INTERVAL '7 days'
GROUP BY dc.name, dc.type
ORDER BY messages DESC;
```

---

## 🔧 Advanced Configuration

### Sync Only Active Threads

By default, we sync both active and archived threads. To sync only active:

Edit `discordSyncService.ts`:

```typescript
// In syncForumChannel method
const activeThreads = await this.discordClient.getActiveThreads(channelId);
// Comment out archived threads:
// const archivedThreads = await this.discordClient.getArchivedThreads(channelId);
const allThreads = activeThreads; // Only active
```

### Limit Thread Count

To limit the number of threads synced:

```typescript
const archivedThreads = await this.discordClient.getArchivedThreads(channelId, { 
  limit: 50 // Only fetch last 50 archived threads
});
```

---

## 🎨 Benefits of Forum Channel Support

### 1. **Complete Coverage**
- ✅ Syncs ALL threads in forum
- ✅ Includes active and archived threads
- ✅ No discussions missed

### 2. **Organized Data**
- ✅ All messages linked to parent forum
- ✅ Easy to query by forum channel
- ✅ Preserves discussion context

### 3. **Comprehensive Reports**
- ✅ AI reports include all forum activity
- ✅ Topic-based insights
- ✅ Contributor analysis across threads

### 4. **Historical Analysis**
- ✅ Archived threads included
- ✅ Long-term trend analysis
- ✅ Complete project history

---

## 🆘 Troubleshooting

### Forum Channel Not Syncing

**Problem:** Forum channel shows 0 messages

**Solution:**
1. Verify `isForum: true` is set in mappings
2. Check bot has permission to view threads
3. Ensure threads exist in the forum

### Missing Some Threads

**Problem:** Not all threads are synced

**Solution:**
1. Increase archived thread limit
2. Check thread age (very old threads may not be fetched)
3. Verify bot joined server before threads were created

### Permission Errors

**Problem:** "Could not fetch threads" error

**Solution:**
1. Bot needs "Read Message History" permission
2. Bot needs "View Channel" permission
3. For private threads, bot needs "Manage Threads" permission

---

## 📝 Example: Complete DAO Setup

Here's a complete example for Molecule DAO with mixed channel types:

```typescript
const CHANNEL_MAPPINGS = [
  // ========================================
  // MOLECULE DAO
  // ========================================
  
  // General discussion (text channel)
  {
    channelId: '1234567890123456790',
    daoSlug: 'molecule',
    channelName: 'molecule-general',
    category: 'Molecule',
    isForum: false,
  },
  
  // Topic-based discussions (forum channel)
  {
    channelId: '1234567890123456791',
    daoSlug: 'molecule',
    channelName: 'molecule-topics',
    category: 'Molecule',
    isForum: true, // ← FORUM - syncs all topic threads
  },
  
  // Design channel (text channel)
  {
    channelId: '1234567890123456792',
    daoSlug: 'molecule',
    channelName: 'molecule-design',
    category: 'Molecule',
    isForum: false,
  },
  
  // Meeting notes (forum channel)
  {
    channelId: '1234567890123456793',
    daoSlug: 'molecule',
    channelName: 'molecule-meeting-room',
    category: 'Molecule',
    isForum: true, // ← FORUM - syncs all meeting threads
  },
];
```

**Result:**
- `molecule-general`: Syncs regular messages
- `molecule-topics`: Syncs all topic threads + messages
- `molecule-design`: Syncs regular messages
- `molecule-meeting-room`: Syncs all meeting threads + messages

---

## ✅ Quick Checklist

- [ ] Run `bun run discord:discover` to identify forum channels
- [ ] Look for channels marked `[FORUM - Topics]`
- [ ] Update mappings with `isForum: true` for forum channels
- [ ] Run `bun run discord:sync`
- [ ] Verify threads are synced in database
- [ ] Check reports include forum activity

---

## 🎉 Summary

**Forum channels are now fully supported!**

- ✅ Automatically detects forum channels
- ✅ Syncs all threads (active + archived)
- ✅ Includes all messages from all threads
- ✅ Generates comprehensive reports
- ✅ Easy to configure with `isForum: true`

**Your topic-based discussions are now tracked and analyzed! 🚀**

