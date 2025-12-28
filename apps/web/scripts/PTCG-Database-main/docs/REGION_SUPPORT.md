# Region Support - Japan & English

## Overview

The scraper now supports both Pokemon Japan and Pokemon English sets from TCGPlayer.

## Database Tables

### sets_jp (Pokemon Japan)
- **Product Line:** `pokemon-japan`
- **URL:** `https://www.tcgplayer.com/search/pokemon-japan/product`
- **Sets Count:** ~431 sets
- **Cards Count:** ~28,154 cards

### sets_en (Pokemon English)
- **Product Line:** `pokemon`
- **URL:** `https://www.tcgplayer.com/search/pokemon/product`
- **Sets Count:** TBD (to be determined after first update)
- **Cards Count:** TBD

## Updating Sets Metadata

### Japan Sets
```bash
# Update sets_jp table
python manage.py sets:update jp --headless
```

This will:
1. Connect to TCGPlayer Pokemon Japan page
2. Extract all Japan sets metadata (display_name, card_count, set_slug)
3. Update the `sets_jp` table in Supabase
4. Report any new sets found

### English Sets
```bash
# Update sets_en table
python manage.py sets:update en --headless
```

This will:
1. Connect to TCGPlayer Pokemon (English) page
2. Extract all English sets metadata
3. Update the `sets_en` table in Supabase
4. Report any new sets found

## Table Schema

Both tables share the same schema:

```sql
CREATE TABLE sets_[region] (
    set_name TEXT PRIMARY KEY,      -- Database identifier
    set_slug TEXT,                  -- URL slug (e.g., "base-set")
    display_name TEXT,              -- Display name from TCGPlayer
    card_count INTEGER              -- Expected number of cards
);
```

## Workflow Example

### For Japan Sets (Current Implementation)
```bash
# 1. Update sets metadata
python manage.py sets:update jp --headless

# 2. Clear and scrape
python manage.py db:clear
python manage.py scrape:all

# 3. Verify
python manage.py db:count
python manage.py db:report
```

### For English Sets (Future)
```bash
# 1. Update sets metadata
python manage.py sets:update en --headless

# 2. Create card_en table (similar to card_jp)
# 3. Create English scraper
# 4. Scrape English sets
```

## Implementation Details

### URL Construction

**Japan:**
```
Base URL: https://www.tcgplayer.com/search/pokemon-japan/product
Filter: productLineName=pokemon-japan&view=grid
```

**English:**
```
Base URL: https://www.tcgplayer.com/search/pokemon/product
Filter: productLineName=pokemon&view=grid
```

### Service Configuration

The `SetsUpdaterService` uses a configuration dictionary:

```python
REGIONS = {
    'jp': {
        'table': 'sets_jp',
        'product_line': 'pokemon-japan',
        'display_name': 'Pokemon Japan'
    },
    'en': {
        'table': 'sets_en',
        'product_line': 'pokemon',
        'display_name': 'Pokemon English'
    }
}
```

### Adding More Regions

To add support for more regions (e.g., Korean, Chinese):

1. Add configuration to `REGIONS` dict in `SetsUpdaterService`
2. Create corresponding database table (e.g., `sets_kr`)
3. No other code changes needed!

Example:
```python
'kr': {
    'table': 'sets_kr',
    'product_line': 'pokemon-korean',  # Verify actual TCGPlayer product line
    'display_name': 'Pokemon Korean'
}
```

## Python API

```python
from services import SetsUpdaterService

# Initialize for specific region
updater = SetsUpdaterService(region='jp')  # or 'en'

# Update from TCGPlayer
result = updater.update_from_tcgplayer(headless=True)

# Check results
print(f"Region: {updater.config['display_name']}")
print(f"Table: {updater.config['table']}")
print(f"Updated: {result['updated']} sets")
print(f"New: {len(result['new_sets'])} sets")
```

## Verification

After updating sets:

```bash
# Check Japan sets
python -c "from services import DatabaseService; \
db = DatabaseService(); \
client = db.supabase; \
r = client.table('sets_jp').select('*', count='exact').execute(); \
print(f'Japan sets: {r.count}')"

# Check English sets
python -c "from services import DatabaseService; \
db = DatabaseService(); \
client = db.supabase; \
r = client.table('sets_en').select('*', count='exact').execute(); \
print(f'English sets: {r.count}')"
```

## Benefits

1. ✅ **Multi-region support** - Easy to add new regions
2. ✅ **Consistent interface** - Same commands for all regions
3. ✅ **Flexible configuration** - Change URLs/tables without code changes
4. ✅ **Future-proof** - Ready for card_en scraper implementation

