# PTCG Database Scraper

Pokemon TCG Japan card scraper for TCGPlayer.com

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables (create .env file)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
CHROME_VERSION_MAIN=142

# Update sets metadata from TCGPlayer (optional, if new sets released)
python manage.py sets:update jp --headless  # For Japan sets
python manage.py sets:update en --headless  # For English sets

# Clear database and reset ID
python manage.py db:clear

# Scrape all sets
python manage.py scrape:all

# Update set slugs
python manage.py db:update-slugs

# Generate missing cards report
python manage.py db:report

# Scrape missing sets (if any)
python manage.py scrape:missing
```

## Management CLI

### Database Commands

- `python manage.py db:clear` - Clear card_jp table and reset ID sequence
- `python manage.py db:count` - Get total card count
- `python manage.py db:update-slugs` - Update set_slug for all cards
- `python manage.py db:report` - Generate missing cards report

### Sets Management Commands

- `python manage.py sets:update jp` - Update sets_jp table from TCGPlayer (Japan)
- `python manage.py sets:update en` - Update sets_en table from TCGPlayer (English)
- `python manage.py sets:update jp --headless` - Update in headless mode

### Scraper Commands

- `python manage.py scrape:all` - Scrape all 431 sets (~28,154 cards)
- `python manage.py scrape:missing` - Scrape sets with missing cards
- `python manage.py scrape:set <slug>` - Scrape a single set (for testing)
- `python manage.py scrape:sets <slug1,slug2>` - Scrape multiple specific sets

## Project Structure

```
selenium-scraper/
├── manage.py              # Main CLI tool
├── services/              # Business logic services
│   ├── database_service.py      # Database operations
│   ├── scraper_service.py       # Scraper operations
│   └── sets_updater_service.py  # Sets metadata updater
├── testSpider/            # Scrapy project
│   ├── spiders/
│   │   └── tcgplayer_jp.py   # Main spider
│   ├── custom_middleware.py   # Selenium middleware
│   └── tcgplayer_pipeline.py  # Supabase pipeline
├── data/                  # Data files
│   ├── all_sets.txt              # List of all set slugs
│   ├── tcgplayer_pokemon_japan_sets_detailed.txt
│   ├── tcgplayer_sets_slugs_JP.txt
│   └── missing_cards_report.txt  # Generated report
├── archives/              # Archived files
│   ├── sql/              # SQL scripts
│   └── logs/             # Log files
└── docs/                  # Documentation
```

## Features

- **Headless Mode**: Runs Chrome in headless mode for efficiency
- **Browser Restart**: Restarts browser after each set for stability
- **Retry Logic**: Retries failed sets 3 times before skipping
- **Sequential Processing**: Processes sets one at a time to prevent interference
- **Safety Checks**: Validates cards belong to correct set before saving
- **Supabase Integration**: Direct database integration for real-time updates

## Configuration

### Environment Variables

Create a `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
CHROME_VERSION_MAIN=142
```

### Scrapy Settings

Edit `testSpider/settings.py` for:
- Concurrent requests
- Download delays
- User agents
- Proxy settings

## Database Schema

### card_jp Table

- `id` (bigint) - Primary key, auto-increment
- `card_name` (text) - Card name
- `set_name` (text) - Set display name
- `set_slug` (text) - Set slug for URL
- `card_index` (text) - Card number (e.g., "001/100")
- `rarity` (text) - Card rarity
- `image_urls` (text) - Card image URLs
- `product_slug` (text) - TCGPlayer product slug
- `product_id` (text) - TCGPlayer product ID

### sets_jp Table

- `set_name` (text) - Primary key
- `set_slug` (text) - URL slug
- `display_name` (text) - Display name
- `card_count` (integer) - Expected card count

## Troubleshooting

### Chrome Version Mismatch

If you get Chrome version errors:
```bash
# Check your Chrome version
google-chrome --version  # or "Google Chrome" on Mac

# Set the version in .env
CHROME_VERSION_MAIN=142  # Use your Chrome major version
```

### Scraper Stops After One Set

This is fixed in the current version. The browser now properly restarts between sets with a 3-second delay.

### Missing Cards

1. Generate report: `python manage.py db:report`
2. Check `data/missing_cards_report.txt`
3. Scrape missing sets: `python manage.py scrape:missing`

## Development

### Running Tests

```bash
# Test single set
python manage.py scrape:set "10th-movie-commemoration-set"

# Test specific sets
python manage.py scrape:sets "set-slug-1,set-slug-2"
```

### Adding New Features

Services are in `services/` directory:
- `DatabaseService` - Database operations
- `ScraperService` - Scraper operations

Extend these classes to add new functionality.

## License

MIT License
