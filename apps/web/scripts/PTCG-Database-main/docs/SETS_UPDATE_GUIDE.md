# Sets Metadata Update Guide

## Overview

The `sets:update` command updates the sets tables (`sets_jp` or `sets_en`) in Supabase with the latest metadata from TCGPlayer.com, including:
- **Display names** - The official set names as shown on TCGPlayer
- **Card counts** - The total number of cards in each set
- **Set slugs** - URL-friendly identifiers for each set

## Supported Regions

- **`jp`** - Pokemon Japan sets (updates `sets_jp` table)
- **`en`** - Pokemon English sets (updates `sets_en` table)

## When to Use

Run this command when:
1. 🆕 **New sets are released** on TCGPlayer
2. 📊 **Card counts change** for existing sets
3. 🔄 **Before a full scrape** to ensure accurate target counts
4. 📅 **Monthly maintenance** to stay in sync with TCGPlayer

## Usage

### Update Japan Sets
```bash
# Basic command (with visible browser)
python manage.py sets:update jp

# Headless mode (recommended)
python manage.py sets:update jp --headless
```

### Update English Sets
```bash
# Basic command (with visible browser)
python manage.py sets:update en

# Headless mode (recommended)
python manage.py sets:update en --headless
```

Headless mode:
- ✅ Faster execution
- ✅ No visible browser window
- ✅ Better for automated tasks
- ✅ Lower resource usage

## What It Does

1. **Connects to Supabase** and loads existing sets
2. **Opens TCGPlayer** Pokemon Japan search page
3. **Expands the Set filter** to view all available sets
4. **Scrolls through the list** to load all options (lazy-loaded)
5. **Extracts metadata** for each set:
   - Display name (e.g., "S10a: Dark Phantasma")
   - Card count (e.g., 71)
   - URL slug (e.g., "s10a-dark-phantasma")
6. **Matches sets** with database using normalized names
7. **Updates existing sets** with latest metadata
8. **Reports new sets** found on TCGPlayer but not in database

## Example Output

### Japan Sets Update
```
🔄 Updating Pokemon Japan sets from TCGPlayer...
📥 Fetching existing sets from sets_jp...
✓ Found 431 existing sets

🌐 Loading TCGPlayer: https://www.tcgplayer.com/search/pokemon-japan/...
⏳ Waiting for page to load...
🔍 Looking for 'Set' filter...
📋 Extracting set options...
✓ Found 435 set options

📝 Sample (first 5 options):
  [1] S10a: Dark Phantasma (71)
  [2] S10d: Time Gazer (67)
  [3] S10p: Space Juggler (67)
  [4] S11: Lost Abyss (100)
  [5] S11a: Incandescent Arcana (68)

🔄 Processing 435 sets...
  ✓ Updated: S10a: Dark Phantasma (Count: 71, Slug: s10a-dark-phantasma)
  ✓ Updated: S10d: Time Gazer (Count: 67, Slug: s10d-time-gazer)
  ...
  ⚠️  New set (not in DB): New Set Name

✅ Updated 431 existing sets
⚠️  Found 4 new sets not in database:
  - New Set 1 (50 cards)
  - New Set 2 (100 cards)
  ...

🔒 Closing browser...

📊 Summary:
   Updated: 431 sets
   New sets found: 4
   Total processed: 435
```

## Handling New Sets

If new sets are found, you have two options:

### Option 1: Add New Sets to Database
Manually add the new sets to `sets_jp` table in Supabase, then run the update again.

### Option 2: Add to Scraping List
Add the new set slugs to `data/all_sets.txt` to include them in your next scrape.

## Troubleshooting

### Filter Not Found
If the Set filter can't be clicked:
- A debug screenshot is saved as `debug_filter_not_found.png`
- Check if TCGPlayer's UI has changed
- Try running without `--headless` to see what's happening

### Unmatched Sets
If many sets show as "No match in DB":
- The set names in your database might not match TCGPlayer's format
- Check the normalization logic in the service
- Manually verify set names in Supabase

### Timeout Issues
If the page loads slowly:
- Increase wait times in `sets_updater_service.py`
- Check your internet connection
- Try again during off-peak hours

## Python API

For programmatic access:

```python
from services import SetsUpdaterService

# Update Japan sets
updater_jp = SetsUpdaterService(region='jp')
result = updater_jp.update_from_tcgplayer(headless=True)

print(f"Updated: {result['updated']}")
print(f"New sets: {len(result['new_sets'])}")

# Process new sets
for new_set in result['new_sets']:
    display_name = new_set['display_name']
    slug = new_set['slug']
    count = new_set['count']
    print(f"New: {display_name} ({count} cards, slug: {slug})")

# Update English sets
updater_en = SetsUpdaterService(region='en')
result = updater_en.update_from_tcgplayer(headless=True)
print(f"Updated {result['updated']} English sets")
```

## Best Practices

1. ✅ **Run monthly** to catch new releases
2. ✅ **Use headless mode** for automated tasks
3. ✅ **Run before full scrapes** to get accurate counts
4. ✅ **Check new sets report** to stay up-to-date
5. ✅ **Verify card counts** match your expectations

## Related Commands

After updating sets metadata, you might want to:

```bash
# Generate report to see which sets need scraping
python manage.py db:report

# Scrape missing cards
python manage.py scrape:missing

# Get current database count
python manage.py db:count
```

