#!/usr/bin/env python
"""
Management CLI for PTCG Database Scraper

Usage:
    python manage.py db:clear              # Clear database and reset ID
    python manage.py db:count              # Get total card count
    python manage.py db:update-slugs       # Update set slugs for all cards
    python manage.py db:report             # Generate missing cards report
    
    python manage.py sets:update jp        # Update sets_jp from TCGPlayer (Japan)
    python manage.py sets:update en        # Update sets_en from TCGPlayer (English)
    python manage.py sets:update jp --headless  # Update in headless mode
    
    python manage.py scrape:all            # Scrape all sets
    python manage.py scrape:missing        # Scrape sets with missing cards
    python manage.py scrape:set <slug>     # Scrape a specific set
    python manage.py scrape:sets <slug1,slug2,...>  # Scrape multiple sets
"""
import sys
from services import DatabaseService, ScraperService, SetsUpdaterService


def print_help():
    """Print help message"""
    print(__doc__)


def main():
    if len(sys.argv) < 2:
        print_help()
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        # Database commands
        if command.startswith('db:'):
            db = DatabaseService()
            
            if command == 'db:clear':
                db.clear_and_reset()
                print(f"✅ Current card count: {db.get_card_count()}")
                
            elif command == 'db:count':
                count = db.get_card_count()
                print(f"📊 Total cards in database: {count}")
                
            elif command == 'db:update-slugs':
                result = db.update_set_slugs()
                print(f"✅ Matched and updated {result['matched']}/{result['total']} sets")
                if result['unmatched']:
                    print(f"\n⚠️  {len(result['unmatched'])} sets could not be matched:")
                    for name in sorted(result['unmatched'])[:10]:
                        print(f"  - {name}")
                    if len(result['unmatched']) > 10:
                        print(f"  ... and {len(result['unmatched']) - 10} more")
                
            elif command == 'db:report':
                discrepancies = db.generate_missing_cards_report()
                print(f"📋 Found {len(discrepancies)} sets with discrepancies")
                print(f"   Missing cards: {sum(d['diff'] for d in discrepancies if d['diff'] > 0)}")
                print(f"   Extra cards: {-sum(d['diff'] for d in discrepancies if d['diff'] < 0)}")
                
            else:
                print(f"❌ Unknown database command: {command}")
                print_help()
                sys.exit(1)
        
        # Sets commands
        elif command.startswith('sets:'):
            if command == 'sets:update':
                # Get region parameter (jp or en)
                if len(sys.argv) < 3:
                    print("❌ Please specify region: 'jp' or 'en'")
                    print("Usage: python manage.py sets:update jp")
                    print("       python manage.py sets:update en")
                    print("       python manage.py sets:update jp --headless")
                    sys.exit(1)
                
                region = sys.argv[2].lower()
                if region not in ['jp', 'en']:
                    print(f"❌ Invalid region '{region}'. Must be 'jp' or 'en'")
                    sys.exit(1)
                
                # Check for --headless flag
                headless = '--headless' in sys.argv
                
                updater = SetsUpdaterService(region=region)
                result = updater.update_from_tcgplayer(headless=headless, insert_new=True)
                print(f"\n📊 Summary:")
                print(f"   Updated: {result['updated']} sets")
                print(f"   Inserted: {result.get('inserted', 0)} new sets")
                if result.get('failed'):
                    print(f"   Failed: {len(result['failed'])} sets")
                print(f"   Total processed: {result['total_processed']}")
                
            else:
                print(f"❌ Unknown sets command: {command}")
                print_help()
                sys.exit(1)
        
        # Scraper commands
        elif command.startswith('scrape:'):
            scraper = ScraperService()
            
            if command == 'scrape:all':
                result = scraper.scrape_all_sets()
                sys.exit(result.returncode)
                
            elif command == 'scrape:missing':
                result = scraper.scrape_missing_sets()
                if result:
                    sys.exit(result.returncode)
                else:
                    print("ℹ️  No missing sets to scrape")
                    sys.exit(0)
                
            elif command == 'scrape:set':
                if len(sys.argv) < 3:
                    print("❌ Please provide a set slug")
                    print("Usage: python manage.py scrape:set <slug>")
                    sys.exit(1)
                set_slug = sys.argv[2]
                result = scraper.test_single_set(set_slug)
                sys.exit(result.returncode)
                
            elif command == 'scrape:sets':
                if len(sys.argv) < 3:
                    print("❌ Please provide set slugs separated by commas")
                    print("Usage: python manage.py scrape:sets <slug1,slug2,slug3>")
                    sys.exit(1)
                set_slugs = [s.strip() for s in sys.argv[2].split(',')]
                result = scraper.scrape_specific_sets(set_slugs)
                sys.exit(result.returncode)
                
            else:
                print(f"❌ Unknown scraper command: {command}")
                print_help()
                sys.exit(1)
        
        else:
            print(f"❌ Unknown command: {command}")
            print_help()
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()

