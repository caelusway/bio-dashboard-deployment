# Discord Category-Based Mapping Guide

## 📋 Overview

Your Discord server is organized with **categories** (folders) that contain multiple channels. Each category typically represents one DAO/project.

**Example Structure:**
```
Bio Ecosystem Discord Server
├── 📂 Molecule (Category)
│   ├── 💬 molecule-general
│   ├── 💬 molecule-topics
│   ├── 💬 molecule-design
│   └── 💬 molecule-meeting-room
│
├── 📂 D1CkDAO (Category)
│   ├── 💬 d1ckdao-general
│   ├── 💬 d1ckdao-topics
│   ├── 💬 d1ckdao-design
│   └── 💬 d1ckdao-meeting-room
│
├── 📂 Nootropics (Category)
│   ├── 💬 nootropics-general
│   └── 💬 nootropics-topics
│
└── ... more categories
```

---

## 🔍 Step 1: Discover Your Server Structure

Run the discovery script to see your entire Discord server structure:

```bash
cd apps/bio-internal
bun run discord:discover
```

**Output Example:**
```
📁 DISCORD SERVER STRUCTURE

📂 Category: MOLECULE
   Category ID: 1234567890123456789
   ────────────────────────────────────────────────────────────────────
   📄 molecule-general
      Channel ID: 1234567890123456790
   📄 molecule-topics
      Channel ID: 1234567890123456791
   📄 molecule-design
      Channel ID: 1234567890123456792

📂 Category: D1CKDAO
   Category ID: 1234567890123456793
   ────────────────────────────────────────────────────────────────────
   📄 d1ckdao-general
      Channel ID: 1234567890123456794
   📄 d1ckdao-topics
      Channel ID: 1234567890123456795
   📄 d1ckdao-design
      Channel ID: 1234567890123456796
   📄 d1ckdao-meeting-room
      Channel ID: 1234567890123456797

... more categories ...
```

**💡 TIP:** Copy this output - you'll need the Channel IDs!

---

## 🗺️ Step 2: Map Categories to DAOs

### 2.1 Check Your Database DAOs

First, see what DAOs exist in your database:

```bash
psql $SUPABASE_DB_URL -c "SELECT slug, name FROM dao_entities ORDER BY name;"
```

**Example Output:**
```
     slug      |      name
---------------+----------------
 d1ckdao       | D1CkDAO
 microbiomedao | MicrobiomeDAO
 microdao      | MicroDAO
 molecule      | Molecule
 nootropics    | Nootropics
 reflexdao     | ReflexDAO
```

### 2.2 Match Discord Categories to DAO Slugs

Create a mapping table:

| Discord Category | DAO Slug (Database) | Match? |
|-----------------|---------------------|--------|
| Molecule        | molecule            | ✅     |
| D1CkDAO         | d1ckdao             | ✅     |
| Nootropics      | nootropics          | ✅     |
| ReflexDAO       | reflexdao           | ✅     |
| MicrobiomeDAO   | microbiomedao       | ✅     |
| MicroDAO        | microdao            | ✅     |

---

## ✏️ Step 3: Update Channel Mappings

Edit `apps/bio-internal/scripts/discord-sync-and-report.ts`:

### Example Mapping Structure

```typescript
const CHANNEL_MAPPINGS = [
  // ========================================
  // MOLECULE DAO
  // All channels under "Molecule" category
  // ========================================
  {
    channelId: '1234567890123456790',
    daoSlug: 'molecule',           // Must match database
    channelName: 'molecule-general',
    category: 'Molecule',           // Discord category name
  },
  {
    channelId: '1234567890123456791',
    daoSlug: 'molecule',
    channelName: 'molecule-topics',
    category: 'Molecule',
  },
  {
    channelId: '1234567890123456792',
    daoSlug: 'molecule',
    channelName: 'molecule-design',
    category: 'Molecule',
  },
  
  // ========================================
  // D1CKDAO
  // All channels under "D1CkDAO" category
  // ========================================
  {
    channelId: '1234567890123456794',
    daoSlug: 'd1ckdao',
    channelName: 'd1ckdao-general',
    category: 'D1CkDAO',
  },
  {
    channelId: '1234567890123456795',
    daoSlug: 'd1ckdao',
    channelName: 'd1ckdao-topics',
    category: 'D1CkDAO',
  },
  {
    channelId: '1234567890123456796',
    daoSlug: 'd1ckdao',
    channelName: 'd1ckdao-design',
    category: 'D1CkDAO',
  },
  {
    channelId: '1234567890123456797',
    daoSlug: 'd1ckdao',
    channelName: 'd1ckdao-meeting-room',
    category: 'D1CkDAO',
  },
  
  // ... continue for all DAOs
];
```

### Key Points

1. **channelId**: Copy from discovery script output
2. **daoSlug**: Must exactly match your database `dao_entities.slug`
3. **channelName**: Descriptive name (for logs/reports)
4. **category**: Discord category name (helps organize reports)

---

## 🎯 Step 4: Apply Category Migration

Add category fields to the database:

```bash
cd apps/bio-internal
psql $SUPABASE_DB_URL -f drizzle/0009_add_discord_categories.sql
```

**Or use Drizzle:**
```bash
bun run drizzle:migrate
```

---

## 🚀 Step 5: Run Sync

```bash
cd apps/bio-internal
bun run discord:sync
```

The system will now:
1. ✅ Sync all channels grouped by category
2. ✅ Collect messages from all channels in each DAO
3. ✅ Generate reports per channel
4. ✅ Store category information for better organization

---

## 📊 Step 6: Query by Category

### View Channels by DAO and Category

```sql
SELECT 
  de.name as dao_name,
  dc.category,
  dc.name as channel_name,
  COUNT(dm.id) as message_count
FROM discord_channels dc
LEFT JOIN dao_entities de ON dc.dao_id = de.id
LEFT JOIN discord_messages dm ON dc.id = dm.channel_id
WHERE dm.posted_at >= NOW() - INTERVAL '7 days'
GROUP BY de.name, dc.category, dc.name
ORDER BY de.name, dc.category, dc.name;
```

**Example Output:**
```
   dao_name    |  category  |    channel_name     | message_count
---------------+------------+---------------------+---------------
 D1CkDAO       | D1CkDAO    | d1ckdao-design      |            23
 D1CkDAO       | D1CkDAO    | d1ckdao-general     |           156
 D1CkDAO       | D1CkDAO    | d1ckdao-meeting     |            45
 D1CkDAO       | D1CkDAO    | d1ckdao-topics      |            89
 Molecule      | Molecule   | molecule-design     |            12
 Molecule      | Molecule   | molecule-general    |           234
 Molecule      | Molecule   | molecule-topics     |            67
```

### Get Total Activity per DAO

```sql
SELECT 
  de.name as dao_name,
  dc.category,
  COUNT(DISTINCT dc.id) as channel_count,
  COUNT(dm.id) as total_messages,
  COUNT(DISTINCT dm.author_id) as unique_contributors
FROM discord_channels dc
LEFT JOIN dao_entities de ON dc.dao_id = de.id
LEFT JOIN discord_messages dm ON dc.id = dm.channel_id
WHERE dm.posted_at >= NOW() - INTERVAL '7 days'
GROUP BY de.name, dc.category
ORDER BY total_messages DESC;
```

---

## 🎨 Benefits of Category Mapping

### 1. **Better Organization**
- All channels for a DAO are grouped together
- Easy to see which category each channel belongs to
- Reports can be organized by category

### 2. **Comprehensive Coverage**
- Track ALL channels for each project
- Don't miss any discussions
- Get complete picture of DAO activity

### 3. **Flexible Reporting**
- Generate reports per channel
- Or aggregate by category/DAO
- Compare activity across projects

### 4. **Easy Maintenance**
- When new channels are added to a category, just add them to mappings
- Category structure is preserved
- Clear organization in database

---

## 🔄 Adding New Channels

When a new channel is created in Discord:

1. **Run discovery script:**
   ```bash
   bun run discord:discover
   ```

2. **Find the new channel ID** in the output

3. **Add to mappings:**
   ```typescript
   {
     channelId: 'NEW_CHANNEL_ID',
     daoSlug: 'existing-dao-slug',
     channelName: 'new-channel-name',
     category: 'Existing Category',
   },
   ```

4. **Run sync:**
   ```bash
   bun run discord:sync
   ```

---

## 📈 Advanced: Category-Level Reports

You can generate reports that aggregate all channels in a category:

```typescript
// Future enhancement - aggregate by category
async function generateCategoryReport(daoSlug: string, category: string) {
  // Get all channels in this category
  const channels = await db
    .select()
    .from(discordChannels)
    .where(
      and(
        eq(discordChannels.daoSlug, daoSlug),
        eq(discordChannels.category, category)
      )
    );
  
  // Aggregate messages from all channels
  // Generate comprehensive category-level report
}
```

---

## 🆘 Troubleshooting

### Category Not Showing

**Problem:** Category field is null in database

**Solution:**
1. Make sure you applied migration 0009
2. Re-run sync to update existing channels
3. Check that `category` field is set in mappings

### Channels in Wrong Category

**Problem:** Channels mapped to wrong DAO

**Solution:**
1. Run discovery script to verify structure
2. Update `daoSlug` in mappings to correct value
3. Re-run sync

### Missing Channels

**Problem:** Some channels not syncing

**Solution:**
1. Run discovery script to see all channels
2. Add missing channels to mappings
3. Verify bot has access to those channels

---

## 📝 Example: Complete Mapping for One DAO

Here's a complete example for D1CkDAO with 4 channels:

```typescript
// D1CkDAO has 4 channels in Discord:
// - d1ckdao-general (main discussion)
// - d1ckdao-topics (specific topics)
// - d1ckdao-design (design discussions)
// - d1ckdao-meeting-room (meeting notes)

const CHANNEL_MAPPINGS = [
  {
    channelId: '1234567890123456794',
    daoSlug: 'd1ckdao',
    channelName: 'd1ckdao-general',
    category: 'D1CkDAO',
  },
  {
    channelId: '1234567890123456795',
    daoSlug: 'd1ckdao',
    channelName: 'd1ckdao-topics',
    category: 'D1CkDAO',
  },
  {
    channelId: '1234567890123456796',
    daoSlug: 'd1ckdao',
    channelName: 'd1ckdao-design',
    category: 'D1CkDAO',
  },
  {
    channelId: '1234567890123456797',
    daoSlug: 'd1ckdao',
    channelName: 'd1ckdao-meeting-room',
    category: 'D1CkDAO',
  },
];
```

**Result:**
- All 4 channels synced
- All messages collected
- 4 separate weekly reports generated
- All linked to same DAO in database
- Grouped by category for easy querying

---

## ✅ Quick Checklist

- [ ] Run `bun run discord:discover` to see server structure
- [ ] Check database DAOs with SQL query
- [ ] Match Discord categories to DAO slugs
- [ ] Update `CHANNEL_MAPPINGS` with all channels
- [ ] Include `category` field for each channel
- [ ] Apply migration 0009 for category fields
- [ ] Run `bun run discord:sync`
- [ ] Verify in database that categories are populated
- [ ] Check reports are generated for all channels

---

**You're all set! Your Discord integration now properly handles categories and multiple channels per DAO! 🎉**

