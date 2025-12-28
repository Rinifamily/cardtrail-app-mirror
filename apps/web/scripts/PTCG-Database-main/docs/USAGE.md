# Usage Guide

## Common Workflows

### Initial Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Create .env file with your Supabase credentials
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
CHROME_VERSION_MAIN=142
EOF

# 3. Verify connection
python -c "from services import DatabaseService; db = DatabaseService(); print(f'✅ Connected! Cards in DB: {db.get_card_count()}')"
```

### Complete Scraping Workflow

```bash
# 1. Clear database
python manage.py db:clear

# 2. Scrape all sets (takes 2-3 hours)
python manage.py scrape:all

# 3. Update set slugs
python manage.py db:update-slugs

# 4. Generate missing cards report
python manage.py db:report

# 5. Check results
python manage.py db:count
```

### Scraping Missing Sets

```bash
# 1. Generate report to find missing cards
python manage.py db:report

# 2. Review the report
cat data/missing_cards_report.txt

# 3. Scrape only missing sets
python manage.py scrape:missing

# 4. Verify completion
python manage.py db:report
```

### Testing a Single Set

```bash
# Test with a small set first
python manage.py scrape:set "10th-movie-commemoration-set"

# Check if it worked
python manage.py db:count
```

### Scraping Specific Sets

```bash
# Scrape multiple specific sets
python manage.py scrape:sets "set-slug-1,set-slug-2,set-slug-3"
```

### Updating Sets Metadata from TCGPlayer

When new sets are released on TCGPlayer, update the sets tables:

```bash
# Update Japan sets metadata (display_name, card_count, set_slug)
python manage.py sets:update jp

# Update English sets metadata
python manage.py sets:update en

# Run in headless mode (faster, no visible browser)
python manage.py sets:update jp --headless
python manage.py sets:update en --headless
```

This will:
1. Scrape all Pokemon sets from TCGPlayer (Japan or English)
2. Update existing sets with latest card counts and display names
3. Report any new sets found on TCGPlayer that aren't in your database yet

## When to Update Sets Metadata

You should run `python manage.py sets:update` when:

1. **New Pokemon sets are released** - TCGPlayer adds new sets regularly
2. **Card counts change** - Sometimes TCGPlayer updates the card count for existing sets
3. **Before a full scrape** - Ensure your sets_jp table has the latest data
4. **Monthly maintenance** - Good practice to sync with TCGPlayer monthly

## Python API Usage

You can also use the services directly in Python:

```python
from services import DatabaseService, ScraperService

# Database operations
db = DatabaseService()

# Get card count
total = db.get_card_count()
print(f"Total cards: {total}")

# Update slugs
result = db.update_set_slugs()
print(f"Updated {result['matched']} sets")

# Generate report
discrepancies = db.generate_missing_cards_report()
missing_count = sum(d['diff'] for d in discrepancies if d['diff'] > 0)
print(f"Missing {missing_count} cards across {len(discrepancies)} sets")

# Clear database
db.clear_and_reset()

# Scraper operations
scraper = ScraperService()

# Scrape all sets
scraper.scrape_all_sets()

# Scrape specific sets
scraper.scrape_specific_sets(['set-slug-1', 'set-slug-2'])

# Test single set
scraper.test_single_set('10th-movie-commemoration-set')

# Sets metadata updater
from services import SetsUpdaterService

# Update Japan sets
updater_jp = SetsUpdaterService(region='jp')
result = updater_jp.update_from_tcgplayer(headless=True)
print(f"Updated {result['updated']} Japan sets")
print(f"Found {len(result['new_sets'])} new sets")

# Update English sets
updater_en = SetsUpdaterService(region='en')
result = updater_en.update_from_tcgplayer(headless=True)
print(f"Updated {result['updated']} English sets")

# Access new sets data
for new_set in result['new_sets']:
    print(f"New: {new_set['display_name']} ({new_set['count']} cards)")
```

## Monitoring Progress

### During Scraping

The scraper outputs real-time progress:
```
👉 Applying Set Filter: 10th Movie Commemoration Set
✅ Safety check passed: Found card from '10th Movie Commemoration Set'
[DEBUG] Found 11 card elements on page 1
✓ Set 1/431 | Card 1/28154 | 10th-movie-commemoration-set | Page 1
✓ Set 1/431 | Card 2/28154 | 10th-movie-commemoration-set | Page 1
...
✓ Completed set 1/431: 10th-movie-commemoration-set
🔄 Restarting browser for new set...
```

### Check Progress

```bash
# Get current count
python manage.py db:count

# Generate report to see what's missing
python manage.py db:report

# View the report
cat data/missing_cards_report.txt
```

## Troubleshooting

### Scraper Stops Unexpectedly

1. Check if Chrome crashed:
```bash
ps aux | grep chrome
```

2. Kill any stuck Chrome processes:
```bash
pkill -9 -f chrome
```

3. Resume scraping missing sets:
```bash
python manage.py db:report
python manage.py scrape:missing
```

### Database Connection Issues

```bash
# Test connection
python -c "from services import DatabaseService; DatabaseService()"
```

If it fails, check your `.env` file credentials.

### Wrong Card Count

If card counts don't match expected:

1. Check for duplicates in database
2. Run the report to see which sets are problematic:
```bash
python manage.py db:report
cat data/missing_cards_report.txt
```

3. Re-scrape problematic sets:
```bash
# Get slugs from report, then:
python manage.py scrape:sets "problem-set-1,problem-set-2"
```

## Best Practices

1. **Always clear before full scrape**: Prevents duplicates
   ```bash
   python manage.py db:clear
   ```

2. **Update slugs after scraping**: Ensures proper set references
   ```bash
   python manage.py db:update-slugs
   ```

3. **Generate reports regularly**: Track progress and find issues
   ```bash
   python manage.py db:report
   ```

4. **Use headless mode**: Default setting, faster and more stable

5. **Test with single set first**: Before running full scrape
   ```bash
   python manage.py scrape:set "test-set-slug"
   ```

