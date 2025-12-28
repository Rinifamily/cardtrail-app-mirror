# Changelog

All notable changes to this project will be documented in this file.

## [2024-12-04] - Multi-Region Support

### Added
- ✅ **Multi-region support** for sets metadata updates
  - Support for Pokemon Japan (`jp`) and Pokemon English (`en`)
  - New table `sets_en` for English sets
  - Dynamic URL construction based on region
  
- ✅ **Enhanced SetsUpdaterService**
  - Region-based initialization: `SetsUpdaterService(region='jp')` or `SetsUpdaterService(region='en')`
  - Configurable product lines and table names
  - Easy to extend for more regions (Korean, Chinese, etc.)

- ✅ **Updated CLI commands**
  - `python manage.py sets:update jp` - Update Japan sets
  - `python manage.py sets:update en` - Update English sets
  - Both support `--headless` flag

- ✅ **New documentation**
  - `docs/REGION_SUPPORT.md` - Complete guide for multi-region support
  - Updated `README.md`, `docs/USAGE.md`, and `docs/SETS_UPDATE_GUIDE.md`

### Changed
- Modified `SetsUpdaterService.__init__()` to accept `region` parameter
- Updated `update_from_tcgplayer()` to use dynamic table names and URLs
- Enhanced error handling with fallback for headless mode failures

### Database
- Created new table: `sets_en`
  - Schema: `set_name (PK), set_slug, display_name, card_count`
  - Indexed on `set_slug` for fast lookups

## [2024-12-03] - Code Refactoring & Organization

### Added
- ✅ **Services architecture**
  - `DatabaseService` - All database operations
  - `ScraperService` - All scraper operations
  - `SetsUpdaterService` - Sets metadata updates from TCGPlayer

- ✅ **Unified management CLI** (`manage.py`)
  - Database commands: `db:clear`, `db:count`, `db:update-slugs`, `db:report`
  - Scraper commands: `scrape:all`, `scrape:missing`, `scrape:set`, `scrape:sets`
  - Sets commands: `sets:update`

- ✅ **Organized file structure**
  - `data/` - Useful data files
  - `archives/sql/` - SQL scripts
  - `archives/logs/` - Log files
  - `docs/` - Documentation

### Changed
- Consolidated 10+ temporary scripts into services
- Moved all SQL scripts to `archives/sql/`
- Organized .txt files into `data/` directory

### Removed
- Deleted 20+ temporary test files and scripts
- Removed duplicate and unused SQL files
- Cleaned up test spider files

## [2024-11-XX] - Initial Scraper Implementation

### Added
- ✅ Sequential set scraping with chained requests
- ✅ Set-level retry logic (3 retries before skipping)
- ✅ Browser restart after each set for stability
- ✅ Safety checks to prevent data pollution
- ✅ Comprehensive logging and progress tracking
- ✅ Successfully scraped 28,154 cards from 431 sets

### Features
- Headless mode support for background scraping
- Automatic cookie banner handling
- Dynamic set filter application
- Pagination support with retry logic
- Card extraction with image URLs and metadata
- Supabase integration for data storage

