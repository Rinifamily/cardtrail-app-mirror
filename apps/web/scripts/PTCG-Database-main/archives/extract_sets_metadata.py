#!/usr/bin/env python3
"""
Script to extract Pokemon Japan set metadata (slug, card count) from TCGPlayer
and update the Supabase 'sets' table.
"""

import os
import re
import time
import sys
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_driver():
    """Setup Chrome driver with options"""
    chrome_options = Options()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--start-maximized')
    # Using a standard user agent to avoid detection
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36')
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def get_supabase_client():
    """Create and return Supabase client"""
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Supabase credentials not found in .env file")
        sys.exit(1)
        
    return create_client(supabase_url, supabase_key)

def normalize_set_name(name):
    """
    Normalize set name for matching:
    - Remove all non-alphanumeric characters
    - Convert to lowercase
    Example: "M2a: High Class Pack: MEGA Dream ex" -> "m2ahighclasspackmegadreamex"
    """
    if not name:
        return ""
    return re.sub(r'[^a-zA-Z0-9]', '', name).lower()

def extract_count_from_text(text):
    """
    Extract number from text.
    Handles formats:
    - "Set Name (123)"
    - "Set Name\n123"
    """
    # Try parenthesis format first
    match = re.search(r'\((\d+)\)$', text)
    if match:
        return int(match.group(1))
    
    # Try newline format (common in TCGPlayer new UI)
    # Look for digits at the end of string or on a new line
    match = re.search(r'[\n\r](\d+)\s*$', text)
    if match:
        return int(match.group(1))
        
    return 0

def clean_display_name(text):
    """
    Remove the count from the display name.
    Handles newline separation.
    """
    # Remove parenthesis count
    text = re.sub(r'\s*\(\d+\)$', '', text)
    # Remove newline count
    text = re.sub(r'[\n\r]\d+\s*$', '', text)
    return text.strip()

def extract_slug_from_url(url):
    """
    Extract set slug from URL parameter 'setName'.
    Example: ...&setName=s6h-silver-lance&... -> s6h-silver-lance
    """
    if not url:
        return ""
    match = re.search(r'setName=([^&]+)', url)
    if match:
        return match.group(1)
    return ""

def update_sets_metadata():
    """Main function to extract metadata and update Supabase"""
    
    # 1. Connect to Supabase and fetch existing sets
    print("🔌 Connecting to Supabase...")
    supabase = get_supabase_client()
    
    # Fetch all sets to build a lookup map
    try:
        # Fetch all rows, verify count
        response = supabase.table('sets_jp').select('set_name').execute()
        existing_sets = response.data
        print(f"✓ Fetched {len(existing_sets)} existing sets from database")
        
        if len(existing_sets) == 0:
            print("⚠️  Warning: Database returned 0 sets. Please check if table 'sets' is empty.")
            # Debug: try to insert a dummy record or list tables if possible (manual check recommended)
            
    except Exception as e:
        print(f"❌ Error fetching sets: {e}")
        return

    # Create lookup map: normalized_name -> original_db_name
    db_set_map = {}
    for item in existing_sets:
        orig_name = item['set_name']
        norm_name = normalize_set_name(orig_name)
        db_set_map[norm_name] = orig_name

    # 2. Setup Selenium and scrape
    driver = None
    try:
        driver = setup_driver()
        # Updated URL with pre-selected filters:
        # - ProductLine: pokemon-japan
        # - View: grid
        # - ProductType: Cards (implied by grid view usually, but kept simple)
        url = "https://www.tcgplayer.com/search/pokemon-japan/product?productLineName=pokemon-japan&view=grid"
        
        print(f"\n🔍 Loading TCGPlayer: {url}")
        driver.get(url)
        
        print("⏳ Waiting for page to load...")
        time.sleep(15)  # Increase wait time to 15s
        
        # Find and expand "Set" filter
        print("\n🔍 Looking for 'Set' filter...")
        
        # Try specific class for Set filter button
        filter_clicked = False
        
        # Updated selectors based on user input
        set_filter_selectors = [
            # Target the button that specifically contains "Set" text
            "//button[contains(@class, 'hfb-popover__button') and .//span[contains(text(), 'Set')]]",
            "//button[contains(@class, 'hfb-popover__button') and contains(., 'Set')]", 
            # Fallback to any button containing "Set"
            "//button[contains(text(), 'Set')]",
            "//span[contains(text(), 'Set')]/ancestor::button"
        ]
        
        for xpath in set_filter_selectors:
            try:
                elements = driver.find_elements(By.XPATH, xpath)
                print(f"  Checking xpath '{xpath}': found {len(elements)} elements")
                
                for elem in elements:
                    if elem.is_displayed():
                        # Double check the text to avoid clicking wrong filter
                        elem_text = elem.text.strip()
                        print(f"  Found potential button with text: '{elem_text}'")
                        
                        if "Set" in elem_text:
                            print(f"  Clicking Set filter button...")
                            driver.execute_script("arguments[0].scrollIntoView(true);", elem)
                            time.sleep(1)
                            
                            try:
                                elem.click()
                            except:
                                driver.execute_script("arguments[0].click();", elem)
                                
                            time.sleep(5)
                            filter_clicked = True
                            break
                if filter_clicked:
                    print("  ✓ Set Filter button clicked")
                    break
            except Exception as e:
                print(f"  Error interacting with element: {e}")
                continue
                
        if not filter_clicked:
            print("⚠️  Could not explicitly click 'Set' filter. It might be already open or not found.")
            # Take screenshot for debug
            driver.save_screenshot('debug_filter_not_found.png')
            print("  📸 Saved debug screenshot to debug_filter_not_found.png")
        
        # Now look for the options
        # Structure: search-filter__container -> search-filter__facet
        print("  Extracting set options...")
        
        # CRITICAL FIX: Only look for options inside the currently open popover/dialog
        # The Set filter opens a specific container, we shouldn't search the whole page which might include hidden country filters
        
        # Try to find the container that just opened
        # TCGPlayer popovers often have roles like 'dialog' or specific classes
        popover_selectors = [
            "//div[contains(@class, 'hfb-popover__content')]", 
            "//div[@role='dialog']",
            "//div[contains(@class, 'filter-popover')]"
        ]
        
        labels = []
        for pop_xpath in popover_selectors:
            try:
                # Find visible popovers
                popovers = driver.find_elements(By.XPATH, pop_xpath)
                for pop in popovers:
                    if pop.is_displayed():
                        print(f"  Found visible popover container")
                        # Look for facets INSIDE this popover
                        found = pop.find_elements(By.CLASS_NAME, "search-filter__facet")
                        if found:
                            labels = found
                            print(f"  ✓ Found {len(labels)} options inside popover")
                            break
                if labels:
                    break
            except:
                pass
        
        # Fallback if popover logic fails (but restrict to visible only)
        if not labels:
             print("  ! Specific popover not found, searching all visible facets...")
             all_labels = driver.find_elements(By.CLASS_NAME, "search-filter__facet")
             # Filter for only displayed ones
             labels = [l for l in all_labels if l.is_displayed()]

        # SCROLL LOGIC: The filter list is likely lazy-loaded or scrollable
        # We need to find the scrollable container and scroll it to load all options
        print(f"Initial options found: {len(labels)}")
        
        try:
            # Identify the scrollable container
            # Usually the parent or grandparent of the facets
            if labels:
                first_label = labels[0]
                # Try to find the scrollable parent. This is a guess, might need adjustment.
                # Often it's the div containing the list of facets
                scrollable_container = first_label.find_element(By.XPATH, "./ancestor::div[contains(@class, 'hfb-popover__content') or contains(@style, 'overflow') or contains(@class, 'scroll')]")
                
                print("  Found scrollable container, starting scroll...")
                
                last_count = 0
                retries = 0
                
                # Scroll loop
                while retries < 5:
                    # Scroll to bottom of container
                    driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", scrollable_container)
                    time.sleep(1.5) # Wait for load
                    
                    # Re-find labels to update count check
                    new_labels = driver.find_elements(By.CLASS_NAME, "search-filter__facet")
                    visible_labels = [l for l in new_labels if l.is_displayed()]
                    current_count = len(visible_labels)
                    
                    print(f"  Scrolled... Count: {current_count}")
                    
                    if current_count > last_count:
                        last_count = current_count
                        retries = 0 # Reset retries since we found more
                    else:
                        retries += 1
                        
                print(f"  ✓ Finished scrolling. Total options: {current_count}")
                
                # CRITICAL: Re-fetch all labels after scrolling is done to ensure fresh references
                print("  Re-fetching all labels after scroll...")
                all_labels = driver.find_elements(By.CLASS_NAME, "search-filter__facet")
                labels = [l for l in all_labels if l.is_displayed()]
                
        except Exception as e:
            print(f"  ⚠️ Scroll logic failed or container not found: {e}")
            # Fallback: If we can't find scroll container, try to re-fetch what we have
            all_labels = driver.find_elements(By.CLASS_NAME, "search-filter__facet")
            labels = [l for l in all_labels if l.is_displayed()]

        print(f"Found {len(labels)} potential filter options")

        # Debug: print first 5 options found to verify format
        if labels:
            print("\nDEBUG - First 5 found options:")
            for i, label in enumerate(labels[:5]):
                # Try to get text content recursively if direct text is empty
                text = label.text.strip() or label.get_attribute('textContent').strip() or label.get_attribute('innerText').strip()
                print(f"  [{i}] Text: '{text}'")
                try:
                    inp = label.find_element(By.TAG_NAME, "input")
                    print(f"      Value: '{inp.get_attribute('value')}'")
                except:
                    pass

        updates_count = 0
        
        for label in labels:
            try:
                # The label element usually contains the name and count
                # Try multiple ways to get text
                text = label.text.strip()
                if not text:
                    text = label.get_attribute('textContent').strip()
                
                if not text:
                    continue
                
                # Debug for empty text issue
                # print(f"Processing: '{text}'")
                
                # Skip common UI elements or incorrect facets
                if text.lower() in ['show more', 'show less', 'apply', 'clear']:
                    continue
                    
                # Extract Count
                count = extract_count_from_text(text)
                
                # Extract Display Name
                display_name = clean_display_name(text)
                
                if not display_name:
                    continue

                # Extract Slug
                slug = ""
                
                # 1. Try to find a link element which contains the true slug in URL
                try:
                    # Sometimes the label wraps an 'a' tag, or 'a' tag is a sibling
                    # Based on structure: search-filter__facet -> ... -> a
                    link_elem = label.find_element(By.TAG_NAME, "a")
                    href = link_elem.get_attribute("href")
                    slug_from_url = extract_slug_from_url(href)
                    if slug_from_url:
                        slug = slug_from_url
                except:
                    pass
                
                if not slug:
                    # 2. Try to find input element for value/slug
                    try:
                        input_elem = label.find_element(By.TAG_NAME, "input")
                        raw_value = input_elem.get_attribute("value")
                        # If value is just 'on', it's a checkbox state, not the slug
                        if raw_value and raw_value.lower() != 'on':
                            slug = raw_value
                    except:
                        pass
                
                if not slug:
                    # 3. Generate slug if missing or if value was 'on'
                    # TCGPlayer slug logic: lowercase, replace spaces with hyphens, remove special chars
                    slug = display_name.lower()
                    slug = re.sub(r'[^\w\s-]', '', slug)
                    slug = re.sub(r'[\s_]+', '-', slug)
                
                # Normalize for matching
                norm_name = normalize_set_name(display_name)
                
                # Match with DB
                db_set_name = db_set_map.get(norm_name)
                
                # Debug print for matching logic
                # print(f"DEBUG: '{display_name}' -> Norm: '{norm_name}' -> DB Match: '{db_set_name}'")
                
                if db_set_name:
                    # Only update if count is different to avoid noise, or force update
                    print(f"✓ Match: '{display_name}' -> '{db_set_name}' | Count: {count} | Slug: {slug}")
                    
                    # Update Supabase
                    # IMPORTANT: We only update card_count here to calibrate expectations
                    # We keep slug update as well just in case
                    data = {
                        'slug': slug,
                        'card_count': count,
                        'display_name': display_name
                    }
                    
                    supabase.table('sets_jp').update(data).eq('set_name', db_set_name).execute()
                    updates_count += 1
                else:
                    print(f"⚠️  No match in DB for: '{display_name}' (norm: {norm_name})")

            except Exception as e:
                continue

        print(f"\n✅ Updated {updates_count} sets in Supabase")

    except Exception as e:
        print(f"\n❌ Fatal Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if driver:
            print("\n⏳ Closing browser...")
            driver.quit()

if __name__ == "__main__":
    update_sets_metadata()

