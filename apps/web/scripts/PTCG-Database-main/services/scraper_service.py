"""
Scraper service for managing Scrapy spider operations
"""
import os
import subprocess
from typing import List, Optional


class ScraperService:
    """Service for scraper operations"""
    
    def __init__(self, project_root: str = None):
        if project_root is None:
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.project_root = project_root
        self.venv_python = os.path.join(project_root, '.venv', 'bin', 'python')
        self.scrapy_cmd = os.path.join(project_root, '.venv', 'bin', 'scrapy')
    
    def scrape_all_sets(self, sets_file: str = 'all_sets.txt', headless: bool = True) -> subprocess.CompletedProcess:
        """
        Scrape all sets from the provided sets file
        
        Args:
            sets_file: Path to file containing set slugs (one per line)
            headless: Run browser in headless mode
            
        Returns:
            CompletedProcess object with return code and output
        """
        print(f"🕷️  Starting scraper for all sets from {sets_file}...")
        print(f"   Headless mode: {headless}")
        
        env = os.environ.copy()
        env['CHROME_VERSION_MAIN'] = '142'
        
        cmd = [
            self.scrapy_cmd,
            'crawl',
            'tcgplayer_jp',
            '-a',
            f'sets={sets_file}'
        ]
        
        return subprocess.run(
            cmd,
            cwd=self.project_root,
            env=env,
            capture_output=False,
            text=True
        )
    
    def scrape_specific_sets(self, set_slugs: List[str], headless: bool = True) -> subprocess.CompletedProcess:
        """
        Scrape specific sets by their slugs
        
        Args:
            set_slugs: List of set slugs to scrape
            headless: Run browser in headless mode
            
        Returns:
            CompletedProcess object with return code and output
        """
        print(f"🕷️  Starting scraper for {len(set_slugs)} specific sets...")
        print(f"   Sets: {', '.join(set_slugs[:5])}{'...' if len(set_slugs) > 5 else ''}")
        
        sets_str = ','.join(set_slugs)
        
        env = os.environ.copy()
        env['CHROME_VERSION_MAIN'] = '142'
        
        cmd = [
            self.scrapy_cmd,
            'crawl',
            'tcgplayer_jp',
            '-a',
            f'sets={sets_str}'
        ]
        
        return subprocess.run(
            cmd,
            cwd=self.project_root,
            env=env,
            capture_output=False,
            text=True
        )
    
    def scrape_missing_sets(self, missing_report_file: str = 'missing_cards_report.txt') -> Optional[subprocess.CompletedProcess]:
        """
        Scrape sets that have missing cards based on missing_cards_report.txt
        
        Args:
            missing_report_file: Path to missing cards report
            
        Returns:
            CompletedProcess if sets found, None if no missing sets
        """
        if not os.path.exists(missing_report_file):
            print(f"❌ Missing cards report not found: {missing_report_file}")
            return None
        
        # Parse report to get set slugs with missing cards
        missing_sets = []
        with open(missing_report_file, 'r') as f:
            lines = f.readlines()
            for line in lines[2:]:  # Skip header and divider
                if '|' in line:
                    parts = [p.strip() for p in line.split('|')]
                    if len(parts) >= 3:
                        slug = parts[1].strip()
                        if slug and slug != 'Slug':
                            missing_sets.append(slug)
        
        if not missing_sets:
            print("✅ No missing sets found in report")
            return None
        
        print(f"📋 Found {len(missing_sets)} sets with missing cards")
        return self.scrape_specific_sets(missing_sets)
    
    def test_single_set(self, set_slug: str) -> subprocess.CompletedProcess:
        """
        Test scraping a single set
        
        Args:
            set_slug: Slug of the set to test
            
        Returns:
            CompletedProcess object
        """
        print(f"🧪 Testing scraper with set: {set_slug}")
        
        env = os.environ.copy()
        env['CHROME_VERSION_MAIN'] = '142'
        
        cmd = [
            self.scrapy_cmd,
            'crawl',
            'tcgplayer_jp',
            '-a',
            f'sets={set_slug}'
        ]
        
        return subprocess.run(
            cmd,
            cwd=self.project_root,
            env=env,
            capture_output=False,
            text=True
        )

