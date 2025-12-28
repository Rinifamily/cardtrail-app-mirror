"""
Sets Updater Service - Update sets_jp table from TCGPlayer
"""
import os
import re
import time
from typing import Dict, List, Tuple
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


class SetsUpdaterService:
    """Service for updating sets tables from TCGPlayer"""
    
    # Region configurations
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
    
    def __init__(self, region: str = 'jp'):
        """
        Initialize the service
        
        Args:
            region: 'jp' for Pokemon Japan or 'en' for Pokemon English
        """
        if region not in self.REGIONS:
            raise ValueError(f"Invalid region '{region}'. Must be 'jp' or 'en'")
        
        self.region = region
        self.config = self.REGIONS[region]
        self.supabase = self._get_supabase_client()
        self.driver = None
    
    @staticmethod
    def _get_supabase_client() -> Client:
        """Get Supabase client"""
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        if not supabase_url or not supabase_key:
            raise RuntimeError("Supabase credentials not found in .env file")
        return create_client(supabase_url, supabase_key)
    
    def _setup_driver(self, headless: bool = False):
        """Setup Chrome driver using undetected_chromedriver"""
        options = uc.ChromeOptions()
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        
        # Get Chrome version from environment
        version_main = os.getenv('CHROME_VERSION_MAIN', '142')
        
        try:
            driver_kwargs = {
                "options": options,
                "headless": headless,
                "use_subprocess": False,
                "version_main": int(version_main)
            }
            
            driver = uc.Chrome(**driver_kwargs)
            return driver
        except Exception as e:
            print(f"⚠️  Failed to create driver with headless={headless}: {e}")
            # Fallback to non-headless if headless fails
            if headless:
                print("  Retrying without headless mode...")
                driver_kwargs["headless"] = False
                return uc.Chrome(**driver_kwargs)
            raise
    
    @staticmethod
    def _normalize_name(name: str) -> str:
        """Normalize set name for matching"""
        if not name:
            return ""
        return re.sub(r'[^a-zA-Z0-9]', '', name).lower()
    
    @staticmethod
    def _extract_count_from_text(text: str) -> int:
        """Extract card count from text like 'Set Name (123)' or 'Set Name\\n123'"""
        # Try parenthesis format
        match = re.search(r'\((\d+)\)$', text)
        if match:
            return int(match.group(1))
        
        # Try newline format
        match = re.search(r'[\n\r](\d+)\s*$', text)
        if match:
            return int(match.group(1))
        
        return 0
    
    @staticmethod
    def _clean_display_name(text: str) -> str:
        """Remove count from display name"""
        text = re.sub(r'\s*\(\d+\)$', '', text)
        text = re.sub(r'[\n\r]\d+\s*$', '', text)
        return text.strip()
    
    @staticmethod
    def _extract_slug_from_url(url: str) -> str:
        """Extract set slug from URL parameter 'setName'"""
        if not url:
            return ""
        match = re.search(r'setName=([^&]+)', url)
        return match.group(1) if match else ""
    
    def _generate_slug(self, display_name: str) -> str:
        """Generate slug from display name"""
        slug = display_name.lower()
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[\s_]+', '-', slug)
        return slug
    
    def update_from_tcgplayer(self, headless: bool = False, screenshot_on_error: bool = True, insert_new: bool = True) -> Dict[str, any]:
        """
        Update sets table from TCGPlayer
        
        Args:
            headless: Run browser in headless mode
            screenshot_on_error: Take screenshot if filter not found
            insert_new: Whether to insert new sets into database (default: True)
            
        Returns:
            Dict with update statistics
        """
        table_name = self.config['table']
        product_line = self.config['product_line']
        display_name = self.config['display_name']
        
        print(f"🔄 Updating {display_name} sets from TCGPlayer...")
        
        # 1. Fetch existing sets from database
        print(f"📥 Fetching existing sets from {table_name}...")
        response = self.supabase.table(table_name).select('set_name').execute()
        existing_sets = response.data
        print(f"✓ Found {len(existing_sets)} existing sets")
        
        # Create lookup map
        db_set_map = {}
        for item in existing_sets:
            orig_name = item['set_name']
            norm_name = self._normalize_name(orig_name)
            db_set_map[norm_name] = orig_name
        
        # 2. Scrape TCGPlayer
        updates_count = 0
        inserts_count = 0
        new_sets = []
        unmatched = []
        
        try:
            self.driver = self._setup_driver(headless=headless)
            # Give driver a moment to fully initialize
            time.sleep(2)
            
            url = f"https://www.tcgplayer.com/search/{product_line}/product?productLineName={product_line}&view=grid&ProductTypeName=Cards"
            
            print(f"\n🌐 Loading TCGPlayer: {url}")
            self.driver.get(url)
            
            print("⏳ Waiting for page to load...")
            time.sleep(15)
            
            # Find and expand "Set" filter
            print("🔍 Looking for 'Set' filter...")
            filter_clicked = self._click_set_filter()
            
            if not filter_clicked and screenshot_on_error:
                screenshot_path = 'debug_filter_not_found.png'
                self.driver.save_screenshot(screenshot_path)
                print(f"  📸 Saved debug screenshot to {screenshot_path}")
            
            # Extract set options
            print("📋 Extracting set options...")
            labels = self._extract_set_options()
            
            print(f"✓ Found {len(labels)} set options")
            
            # Debug: show first 5
            if labels:
                print("\n📝 Sample (first 5 options):")
                for i, label in enumerate(labels[:5]):
                    text = self._get_element_text(label)
                    print(f"  [{i+1}] {text}")
            
            # Process each set
            print(f"\n🔄 Processing {len(labels)} sets...")
            for label in labels:
                try:
                    text = self._get_element_text(label)
                    if not text or text.lower() in ['show more', 'show less', 'apply', 'clear']:
                        continue
                    
                    # Extract metadata
                    count = self._extract_count_from_text(text)
                    display_name = self._clean_display_name(text)
                    
                    if not display_name:
                        continue
                    
                    # Extract or generate slug
                    slug = self._extract_slug_from_label(label, display_name)
                    
                    # Match with database
                    norm_name = self._normalize_name(display_name)
                    db_set_name = db_set_map.get(norm_name)
                    
                    if db_set_name:
                        # Update existing set
                        data = {
                            'set_slug': slug,
                            'card_count': count,
                            'display_name': display_name
                        }
                        self.supabase.table(table_name).update(data).eq('set_name', db_set_name).execute()
                        updates_count += 1
                        print(f"  ✓ Updated: {display_name} (Count: {count}, Slug: {slug})")
                    else:
                        # New set found
                        if insert_new:
                            # Insert new set into database
                            data = {
                                'set_name': display_name,  # Use display_name as set_name for new sets
                                'set_slug': slug,
                                'card_count': count,
                                'display_name': display_name
                            }
                            try:
                                self.supabase.table(table_name).insert(data).execute()
                                inserts_count += 1
                                print(f"  ✅ Inserted: {display_name} (Count: {count}, Slug: {slug})")
                            except Exception as e:
                                print(f"  ❌ Failed to insert {display_name}: {e}")
                                unmatched.append({
                                    'display_name': display_name,
                                    'slug': slug,
                                    'count': count
                                })
                        else:
                            # Just track unmatched (potential new sets)
                            unmatched.append({
                                'display_name': display_name,
                                'slug': slug,
                                'count': count
                            })
                            print(f"  ⚠️  New set (not in DB): {display_name}")
                
                except Exception as e:
                    continue
            
            print(f"\n✅ Updated {updates_count} existing sets")
            if inserts_count > 0:
                print(f"✅ Inserted {inserts_count} new sets")
            if unmatched:
                print(f"⚠️  Found {len(unmatched)} sets that couldn't be inserted:")
                for item in unmatched[:10]:
                    print(f"  - {item['display_name']} ({item['count']} cards)")
                if len(unmatched) > 10:
                    print(f"  ... and {len(unmatched) - 10} more")
            
            return {
                'updated': updates_count,
                'inserted': inserts_count,
                'failed': unmatched,
                'total_processed': len(labels)
            }
        
        finally:
            if self.driver:
                print("\n🔒 Closing browser...")
                self.driver.quit()
    
    def _click_set_filter(self) -> bool:
        """Click the 'Set' filter button"""
        set_filter_selectors = [
            "//button[contains(@class, 'hfb-popover__button') and .//span[contains(text(), 'Set')]]",
            "//button[contains(@class, 'hfb-popover__button') and contains(., 'Set')]",
            "//button[contains(text(), 'Set')]",
            "//span[contains(text(), 'Set')]/ancestor::button"
        ]
        
        for xpath in set_filter_selectors:
            try:
                elements = self.driver.find_elements(By.XPATH, xpath)
                for elem in elements:
                    if elem.is_displayed() and "Set" in elem.text.strip():
                        self.driver.execute_script("arguments[0].scrollIntoView(true);", elem)
                        time.sleep(1)
                        try:
                            elem.click()
                        except:
                            self.driver.execute_script("arguments[0].click();", elem)
                        time.sleep(5)
                        return True
            except:
                continue
        
        return False
    
    def _extract_set_options(self) -> List:
        """Extract all set option elements with scrolling"""
        # Find visible popover
        popover_selectors = [
            "//div[contains(@class, 'hfb-popover__content')]",
            "//div[@role='dialog']",
            "//div[contains(@class, 'filter-popover')]"
        ]
        
        labels = []
        for pop_xpath in popover_selectors:
            try:
                popovers = self.driver.find_elements(By.XPATH, pop_xpath)
                for pop in popovers:
                    if pop.is_displayed():
                        found = pop.find_elements(By.CLASS_NAME, "search-filter__facet")
                        if found:
                            labels = found
                            break
                if labels:
                    break
            except:
                pass
        
        # Fallback
        if not labels:
            all_labels = self.driver.find_elements(By.CLASS_NAME, "search-filter__facet")
            labels = [l for l in all_labels if l.is_displayed()]
        
        # Scroll to load all options
        try:
            if labels:
                first_label = labels[0]
                scrollable_container = first_label.find_element(
                    By.XPATH,
                    "./ancestor::div[contains(@class, 'hfb-popover__content') or contains(@style, 'overflow')]"
                )
                
                last_count = 0
                retries = 0
                
                while retries < 5:
                    self.driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", scrollable_container)
                    time.sleep(1.5)
                    
                    new_labels = self.driver.find_elements(By.CLASS_NAME, "search-filter__facet")
                    visible_labels = [l for l in new_labels if l.is_displayed()]
                    current_count = len(visible_labels)
                    
                    if current_count > last_count:
                        last_count = current_count
                        retries = 0
                    else:
                        retries += 1
                
                # Re-fetch after scrolling
                all_labels = self.driver.find_elements(By.CLASS_NAME, "search-filter__facet")
                labels = [l for l in all_labels if l.is_displayed()]
        except:
            pass
        
        return labels
    
    def _get_element_text(self, element) -> str:
        """Get text from element"""
        text = element.text.strip()
        if not text:
            text = element.get_attribute('textContent').strip()
        if not text:
            text = element.get_attribute('innerText').strip()
        return text
    
    def _extract_slug_from_label(self, label, display_name: str) -> str:
        """Extract slug from label element"""
        # Try link href
        try:
            link_elem = label.find_element(By.TAG_NAME, "a")
            href = link_elem.get_attribute("href")
            slug_from_url = self._extract_slug_from_url(href)
            if slug_from_url:
                return slug_from_url
        except:
            pass
        
        # Try input value
        try:
            input_elem = label.find_element(By.TAG_NAME, "input")
            raw_value = input_elem.get_attribute("value")
            if raw_value and raw_value.lower() != 'on':
                return raw_value
        except:
            pass
        
        # Generate from display name
        return self._generate_slug(display_name)

