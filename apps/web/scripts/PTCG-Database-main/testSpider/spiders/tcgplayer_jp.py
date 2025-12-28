import os
import re
import sys
import time
from urllib.parse import urlparse
import scrapy
from scrapy_selenium import SeleniumRequest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


class TCGPlayerJPSpider(scrapy.Spider):
    name = "tcgplayer_jp"
    _rarity_cache = None
    _rarity_signature = None
    _supabase_client: Client | None = None
    
    # Custom settings for this spider
    custom_settings = {
        'ITEM_PIPELINES': {
            'testSpider.tcgplayer_pipeline.TCGPlayerPipeline': 300,
        },
        'CONCURRENT_REQUESTS': 1,  # Process one set at a time
        'DOWNLOAD_DELAY': 2,
        'PROXY_ROTATION_ENABLED': False,  # Disable proxy for TCGPlayer
        'DOWNLOADER_MIDDLEWARES': {
            'testSpider.custom_middleware.SeleniumMiddleware': 600,
            'scrapy.downloadermiddlewares.httpproxy.HttpProxyMiddleware': None,  # Disable proxy middleware
            'scrapy_user_agents.middlewares.RandomUserAgentMiddleware': 400,
        },
    }
    
    def _load_slug_display_map(self):
        slug_map = {}
        reverse_map = {}
        detailed_path = os.path.join(self.project_root, 'tcgplayer_pokemon_japan_sets_detailed.txt')
        if not os.path.exists(detailed_path):
            return slug_map, reverse_map
        
        with open(detailed_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('SLUG'):
                    continue
                parts = line.split('\t')
                if len(parts) >= 2:
                    slug = parts[0].strip().lower()
                    display = parts[1].strip()
                    slug_map[slug] = display
                    normalized = self._normalize_display_key(display)
                    if normalized and normalized not in reverse_map:
                        reverse_map[normalized] = slug
        return slug_map, reverse_map

    @classmethod
    def _get_supabase_client(cls):
        if cls._supabase_client is not None:
            return cls._supabase_client
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        if not supabase_url or not supabase_key:
            raise RuntimeError("Supabase credentials are required to load rarity references")
        cls._supabase_client = create_client(supabase_url, supabase_key)
        return cls._supabase_client

    def _normalize_rarity_key(self, value):
        if not value:
            return ''
        value = value.strip().lower()
        value = re.sub(r'\s+', ' ', value)
        return value

    def _load_rarity_lookup(self, force=False):
        cls = self.__class__
        if not force and cls._rarity_cache is not None:
            return cls._rarity_cache
        try:
            client = cls._get_supabase_client()
            response = client.table('rarity_jp').select('rarity_name').execute()
            data = response.data or []
            lookup = {}
            for row in data:
                name = row.get('rarity_name')
                if not name:
                    continue
                key = self._normalize_rarity_key(name)
                if not key:
                    continue
                lookup[key] = name.strip()
            cls._rarity_cache = lookup
            cls._rarity_signature = hash(tuple(sorted(lookup.items())))
            return lookup
        except Exception as exc:
            self.logger.error(f"Failed to load rarity list from Supabase: {exc}")
            cls._rarity_cache = {}
            return cls._rarity_cache

    def _match_rarity(self, raw_value):
        if not raw_value:
            return None
        raw_value = raw_value.strip()
        if not raw_value:
            return None
        normalized = self._normalize_rarity_key(raw_value)
        if not hasattr(self, 'rarity_lookup') or self.rarity_lookup is None:
            self.rarity_lookup = self._load_rarity_lookup()
        lookup = self.rarity_lookup
        if normalized in lookup:
            return lookup[normalized]
        # Remove punctuation for loose matching
        simplified = re.sub(r'[^a-z0-9 ]', '', normalized).strip()
        if simplified in lookup:
            return lookup[simplified]
        for key, value in lookup.items():
            if simplified and (simplified in key or key in simplified):
                return value
            if normalized in key or key in normalized:
                return value
        return None
    
    def _resolve_display_name(self, set_slug, provided_name):
        if provided_name:
            return provided_name.strip()
        if not set_slug:
            return None
        return self.slug_display_map.get(set_slug.strip().lower())
    
    def _normalize_filter_label(self, name):
        replacements = {
            '\u2019': "'",
            '\u2018': "'",
            '\u201c': '"',
            '\u201d': '"',
            '\u00a0': ' '
        }
        normalized = name
        for src, target in replacements.items():
            normalized = normalized.replace(src, target)
        return normalized.replace(' ', '')
    
    def _normalize_display_key(self, value):
        if not value:
            return ''
        normalized = value.lower().replace('&', 'and')
        return re.sub(r'[^a-z0-9]', '', normalized)
    
    def _resolve_set_slug(self, identifier):
        candidate = (identifier or '').strip()
        if not candidate:
            return None
        lowered = candidate.lower()
        if lowered in self.slug_display_map:
            return lowered
        normalized = self._normalize_display_key(candidate)
        if normalized and normalized in self.display_to_slug:
            return self.display_to_slug[normalized]
        slug_candidate = re.sub(r'[^a-z0-9]+', '-', lowered).strip('-')
        if slug_candidate in self.slug_display_map:
            return slug_candidate
        raise ValueError(f"Unknown set identifier '{identifier}'. Please ensure it matches sets_jp.slug or display name.")
    
    def _determine_filter_value(self, set_slug, target_set_name):
        if target_set_name:
            return self._normalize_filter_label(target_set_name)
        return set_slug.strip() if set_slug else None
    
    def _search_set_within_popover(self, driver, query):
        search_input = None
        selectors = [
            "input[placeholder='Find a Set']",
            "input[placeholder='Search...']",
            "input.tcg-input-field__input"
        ]
        for selector in selectors:
            try:
                search_input = WebDriverWait(driver, 5).until(
                    EC.visibility_of_element_located((By.CSS_SELECTOR, selector))
                )
                break
            except TimeoutException:
                continue
        if not search_input:
            return
        try:
            search_input.click()
            search_input.clear()
        except Exception:
            driver.execute_script("arguments[0].value = '';", search_input)
        search_input.send_keys(query)
        time.sleep(2)

    def _normalize_card_index(self, card_name, index_text):
        candidate = (index_text or '').strip()

        def extract_from_text(raw):
            raw = (raw or '').strip().lstrip('#')
            match = re.search(r'(\d{1,3}/\d{1,3})', raw)
            if match:
                return f"#{match.group(1)}"
            return ''

        normalized = extract_from_text(candidate)
        if normalized:
            return normalized

        fallback = extract_from_text(card_name or '')
        if fallback:
            return fallback

        return ''

    def _extract_rarity_and_index(self, card_elem, card_name):
        rarity_value = ''
        index_value = ''
        selectors = [
            '.product-card__rarity__control',
            '.product-card__rarity.bottom-margin .product-card__rarity__variant',
            '.product-card__rarity__variant',
            '.product-card__rarity.bottom-margin',
            '.product-card__rarity'
        ]

        def collect_text_variants(element):
            """Return deduplicated textual representations for an element."""
            texts = []
            getters = (
                lambda e: (e.text or ''),
                lambda e: (e.get_attribute('innerText') or ''),
                lambda e: (e.get_attribute('textContent') or ''),
                lambda e: (e.get_attribute('aria-label') or ''),
                lambda e: (e.get_attribute('data-original-title') or ''),
            )
            for getter in getters:
                try:
                    value = getter(element)
                except Exception:
                    continue
                if not value:
                    continue
                cleaned = value.replace('\u00a0', ' ').strip()
                if cleaned and cleaned not in texts:
                    texts.append(cleaned)
            return texts

        text_candidates = []
        for selector in selectors:
            try:
                rarity_elems = card_elem.find_elements(By.CSS_SELECTOR, selector)
            except Exception:
                continue

            for rarity_elem in rarity_elems:
                # Prefer the explicit children so that we preserve DOM order.
                child_nodes = rarity_elem.find_elements(By.CSS_SELECTOR, 'span, div, p')
                if not child_nodes:
                    child_nodes = [rarity_elem]

                for node in child_nodes:
                    text_candidates.extend(collect_text_variants(node))

            if text_candidates:
                break

        for candidate in text_candidates:
            normalized = self._normalize_card_index(card_name, candidate)
            if normalized and not index_value:
                index_value = normalized
                if not rarity_value:
                    prefix = candidate.split('#', 1)[0]
                    prefix = prefix.replace(',', '').strip()
                    if prefix and not self._normalize_card_index(card_name, prefix):
                        rarity_value = prefix
                continue
            if not normalized and not rarity_value:
                rarity_value = candidate.replace(',', '').strip()

        if not index_value:
            name_fallback = self._normalize_card_index(card_name, card_name)
            if name_fallback:
                index_value = name_fallback
            else:
                full_text = card_elem.text if hasattr(card_elem, 'text') else ''
                full_fallback = self._normalize_card_index(card_name, full_text)
                if full_fallback:
                    index_value = full_fallback

        if rarity_value:
            rarity_value = rarity_value.replace('#', '').strip()
        else:
            fallback_chunks = []
            try:
                rarity_section = card_elem.find_element(By.CSS_SELECTOR, '.product-card__rarity')
                fallback_chunks.extend(collect_text_variants(rarity_section))
            except Exception:
                pass
            try:
                anchor = card_elem.find_element(By.CSS_SELECTOR, 'a[data-testid^="product-card__image"]')
                fallback_chunks.extend(collect_text_variants(anchor))
            except Exception:
                pass
            fallback_chunks.append(getattr(card_elem, 'text', '') or '')
            getter = getattr(card_elem, 'get_attribute', None)
            if getter:
                fallback_chunks.append(getter('textContent') or '')
            for chunk in fallback_chunks:
                chunk = (chunk or '').strip()
                if not chunk:
                    continue
                matched = self._match_rarity(chunk)
                if matched:
                    rarity_value = matched
                    break

        matched_rarity = self._match_rarity(rarity_value)
        return matched_rarity, index_value

    def _extract_product_metadata(self, card_elem):
        product_slug = None
        product_id = None
        image_urls = None

        try:
            link_elem = card_elem.find_element(By.CSS_SELECTOR, 'a[data-testid^="product-card__image"]')
            href = link_elem.get_attribute('href') or ''
            if href:
                parsed = urlparse(href)
                path_parts = [part for part in parsed.path.split('/') if part]
                if len(path_parts) >= 3 and path_parts[0] == 'product':
                    product_id = path_parts[1]
                    slug_part = path_parts[2]
                    product_slug = slug_part.split('?')[0]
        except Exception:
            pass

        try:
            img_elem = card_elem.find_element(By.CSS_SELECTOR, '.product-card__image img')
            src = (img_elem.get_attribute('src') or '').strip()
            srcset = (img_elem.get_attribute('srcset') or '').strip()
            combined = [value for value in (src, srcset) if value]
            if combined:
                image_urls = '|'.join(combined)
        except Exception:
            pass

        return product_slug, product_id, image_urls

    def _find_next_button(self, driver):
        pagination_selectors = [
            "//a[@aria-label='Next page' and not(contains(@class, 'is-disabled'))]",
            "//a[contains(@aria-label, 'Next page')]",
            ".tcg-pagination a[aria-label='Next page']:not(.is-disabled)"
        ]
        for selector in pagination_selectors:
            try:
                if selector.startswith('//'):
                    buttons = driver.find_elements(By.XPATH, selector)
                else:
                    buttons = driver.find_elements(By.CSS_SELECTOR, selector)
                for btn in buttons:
                    if not btn.is_displayed():
                        continue
                    classes = btn.get_attribute('class') or ''
                    aria_disabled = btn.get_attribute('aria-disabled') or ''
                    is_btn_disabled = btn.get_attribute('disabled')
                    if 'is-disabled' in classes or aria_disabled == 'true':
                        continue
                    if btn.tag_name == 'button' and is_btn_disabled:
                        continue
                    return btn
            except Exception:
                continue
        return None

    def _extract_card_index(self, card_elem, card_name):
        _, card_index = self._extract_rarity_and_index(card_elem, card_name)
        return card_index

    def _extract_card_title(self, card_elem):
        """Best-effort extraction of card name, handling lazy-loaded text."""
        selector_candidates = [
            '.product-card__title',
            'h3.product-card__title',
            'h3',
            'h4',
        ]
        for selector in selector_candidates:
            try:
                if selector.startswith('.'):
                    title_elem = card_elem.find_element(By.CSS_SELECTOR, selector)
                else:
                    title_elem = card_elem.find_element(By.TAG_NAME, selector)
            except Exception:
                continue

            getters = (
                lambda e: (e.text or '').strip(),
                lambda e: (e.get_attribute('textContent') or '').strip(),
                lambda e: (e.get_attribute('innerText') or '').strip(),
            )
            for getter in getters:
                value = getter(title_elem)
                if value:
                    return value

        # Fallback to image alt text if title elements are empty
        try:
            img_elem = card_elem.find_element(By.CSS_SELECTOR, 'img')
            alt_text = (img_elem.get_attribute('alt') or '').strip()
            if alt_text:
                return alt_text
        except Exception:
            pass

        return ''
    
    def _handle_cookie_banner(self, driver):
        try:
            cookie_btn = driver.find_element(By.ID, "onetrust-accept-btn-handler")
            if cookie_btn.is_displayed():
                cookie_btn.click()
                time.sleep(1)
        except Exception:
            pass
    
    def _apply_set_filter(self, driver, set_slug, target_set_name):
        filter_value = self._determine_filter_value(set_slug, target_set_name)
        if not filter_value:
            raise ValueError("Missing filter value for set selection")
        
        set_button = None
        button_selectors = [
            (By.CSS_SELECTOR, '[data-testid="filterBar-Set"]'),
            (By.XPATH, "//button[contains(@class, 'hfb-popover__button') and .//span[contains(text(), 'Set')]]"),
            (By.XPATH, "//button[contains(text(), 'Set')]")
        ]
        for by_type, locator in button_selectors:
            try:
                set_button = WebDriverWait(driver, 8).until(
                    EC.element_to_be_clickable((by_type, locator))
                )
                if set_button:
                    break
            except Exception:
                continue
        
        if not set_button:
            raise RuntimeError("Set filter button not found")
        
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", set_button)
        time.sleep(1)
        try:
            set_button.click()
        except Exception:
            driver.execute_script("arguments[0].click();", set_button)
        time.sleep(1.5)
        
        if target_set_name:
            self._search_set_within_popover(driver, target_set_name)
        
        checkbox_id = f"hfb-Set-{filter_value}-filter"
        safe_checkbox_id = checkbox_id.replace('"', '\\"')
        label_selector = f'label[for="{safe_checkbox_id}"]'
        
        try:
            label_elem = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, label_selector))
            )
        except TimeoutException:
            raise TimeoutException(f"Checkbox for {target_set_name or set_slug} not found ({checkbox_id})")
        
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", label_elem)
        time.sleep(0.5)
        try:
            label_elem.click()
        except Exception:
            driver.execute_script("arguments[0].click();", label_elem)
        
        time.sleep(2)
        
        try:
            set_button.click()
        except Exception:
            driver.execute_script("arguments[0].click();", set_button)
        time.sleep(0.5)
    
    def __init__(self, sets=None, *args, **kwargs):
        super(TCGPlayerJPSpider, self).__init__(*args, **kwargs)
        
        self.project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        self.slug_display_map, self.display_to_slug = self._load_slug_display_map()
        self.rarity_lookup = self._load_rarity_lookup(force=True)
        
        raw_sets = []
        if sets:
            # Check if it's a file path first
            if os.path.exists(sets):
                 with open(sets, 'r', encoding='utf-8') as f:
                    raw_sets = [line.strip() for line in f if line.strip()]
            else:
                # Otherwise treat as comma-separated string
                raw_sets = [s.strip() for s in sets.split(',') if s.strip()]
            print(f"Loaded {len(raw_sets)} sets from arguments")
        else:
            # Load all sets from file
            sets_file = os.path.join(self.project_root, 
                                      'tcgplayer_sets_slugs_JP.txt')
            with open(sets_file, 'r', encoding='utf-8') as f:
                raw_sets = [line.strip() for line in f if line.strip()]
        
        self.all_sets = []
        for entry in raw_sets:
            try:
                resolved = self._resolve_set_slug(entry)
                if resolved:
                    self.all_sets.append(resolved)
            except ValueError as exc:
                self.logger.error(exc)
        if not self.all_sets:
            raise RuntimeError("No valid set slugs resolved from provided inputs.")
        
        self.total_sets = len(self.all_sets)
        self.current_set_index = 0
        self.total_cards_scraped = 0
        self.total_cards_target = 28154
        
        # Starting URL (will be modified for each set)
        self.base_url = "https://www.tcgplayer.com/search/pokemon-japan/product"
        
        print(f"\n{'='*70}")
        print(f"TCGPlayer Pokemon Japan Scraper")
        print(f"{'='*70}")
        print(f"Total sets to scrape: {self.total_sets}")
        print(f"Total cards target: {self.total_cards_target}")
        print(f"{'='*70}\n")
    
    def start_requests(self):
        """Start scraping from the first set"""
        for set_slug in self.all_sets:
            self.current_set_index += 1
            
            # Only access the base URL without any filter parameters
            url = "https://www.tcgplayer.com/search/pokemon-japan/product?productLineName=pokemon-japan&view=grid&ProductTypeName=Cards"
            
            print(f"Accessing Base URL: {url}")
            
            yield SeleniumRequest(
                url=url,
                callback=self.parse_set,
                dont_filter=True,
                meta={
                    'set_slug': set_slug,
                    'set_index': self.current_set_index,
                    'page': 1,
                    'target_set_name': getattr(self, 'target_set_name', None)
                }
            )

    def parse_set(self, response):
        """Parse a set page and extract cards"""
        driver = response.meta.get('driver')
        set_slug = response.meta.get('set_slug')
        requested_target_name = response.meta.get('target_set_name')
        target_set_name = self._resolve_display_name(set_slug, requested_target_name)
        set_index = response.meta.get('set_index')
        page = response.meta.get('page')
        response.meta.setdefault('retry_count', 0)
        
        if not driver:
            self.logger.error(f"No driver found for set {set_slug}")
            return
        
        # Apply filters if this is the first page
        if page == 1:
            label_for_logs = target_set_name or set_slug
            try:
                print(f"👉 Applying Set Filter: {label_for_logs}")
                time.sleep(10)
                self._handle_cookie_banner(driver)
                self._apply_set_filter(driver, set_slug, target_set_name)
                time.sleep(8)
            except Exception as e:
                print(f"❌ Failed to apply manual filter for {label_for_logs}: {e}")
                print("   ABORTING: Cannot proceed without correct filter.")
                return

        # Wait for cards to load
        try:
            WebDriverWait(driver, 10).until(
                lambda d: d.find_elements(By.CSS_SELECTOR, '.search-result__product') or 
                          d.find_elements(By.XPATH, "//h1[contains(text(), 'No products found')]") or
                          d.find_elements(By.CSS_SELECTOR, ".blank-slate")
            )
        except TimeoutException:
            print(f"[WARNING] Timeout waiting for cards on page {page} of {set_slug}")
            return
        
        # Scroll down
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2);")
        time.sleep(1)
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(1)
        
        # Extract cards from current page
        cards_on_page = 0
        try:
            card_elements = driver.find_elements(By.CSS_SELECTOR, '.search-result__product')
            total_cards_on_page = len(card_elements)
            
            # Safety Check for Page 1
            if total_cards_on_page > 0 and page == 1 and target_set_name:
                first_card = card_elements[0]
                try:
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", first_card)
                    time.sleep(0.2)
                    
                    check_info = ""
                    try:
                        check_info = first_card.find_element(By.CSS_SELECTOR, '.product-card__set-name').text.strip()
                    except:
                        check_info = first_card.find_element(By.TAG_NAME, 'h4').text.strip()
                    
                    def norm(s): return "".join(e for e in s if e.isalnum()).lower()
                    n_target = norm(target_set_name)
                    n_check = norm(check_info)
                    
                    if n_target not in n_check and n_check not in n_target:
                        if check_info:
                            print(f"❌ SAFETY CHECK FAILED: Expected set '{target_set_name}', but first card belongs to '{check_info}'")
                            print("   Aborting scrape for this set to prevent data pollution.")
                            return
                        else:
                            print("⚠️ Safety check: Could not extract set info from first card.")
                    else:
                        print(f"✅ Safety check passed: Found card from '{check_info}' matching target '{target_set_name}'")
                        
                except Exception as e:
                    print(f"⚠️ Could not perform safety check on first card: {e}")
                    pass

            print(f"\n[DEBUG] Found {total_cards_on_page} card elements on page {page} of {set_slug}")
            
            for i in range(total_cards_on_page):
                try:
                    # Re-find elements
                    card_elements = driver.find_elements(By.CSS_SELECTOR, '.search-result__product')
                    if i >= len(card_elements): break
                    
                    card_elem = card_elements[i]
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", card_elem)
                    time.sleep(0.1)
                    
                    # Extract info (Set Name)
                    info = ""
                    try:
                        info = card_elem.find_element(By.CSS_SELECTOR, '.product-card__set-name').text.strip()
                    except Exception:
                        try:
                             info = card_elem.find_element(By.TAG_NAME, 'h4').text.strip()
                        except:
                             pass
                    
                    if not info:
                        if target_set_name:
                            info = target_set_name
                        else:
                            info = set_slug

                    # Extract card name
                    card_name = self._extract_card_title(card_elem)
                    if card_name:
                        print(f"[DEBUG] Card {i+1}: card_name extracted = '{card_name[:40]}'")
                    else:
                        print(f"[WARNING] Card {i+1}: Title empty after fallback attempts")

                    rarity, card_index = self._extract_rarity_and_index(card_elem, card_name) if card_name else (None, '')
                    product_slug, product_id, image_urls = self._extract_product_metadata(card_elem)
                    
                    if info and card_name:
                        self.total_cards_scraped += 1
                        cards_on_page += 1
                        
                        print(f"✓ Set {set_index}/{self.total_sets} | Card {self.total_cards_scraped}/{self.total_cards_target} | {set_slug} | Page {page}")
                        
                        yield {
                            'info': info,
                            'card_name': card_name,
                            'set_slug': set_slug,
                            'card_index': card_index,
                            'rarity': rarity,
                            'image_urls': image_urls,
                            'product_slug': product_slug,
                            'product_id': product_id
                        }
                    else:
                        print(f"[ERROR] Card {i+1} SKIPPED: info={'YES' if info else 'NO'}, card_name={'YES' if card_name else 'NO'}")
                
                except Exception as e:
                    self.logger.error(f"Error extracting card {i+1}: {e}")
                    continue
        
        except Exception as e:
            self.logger.error(f"Error finding card elements: {e}")
        
        print(f"[DEBUG] Extracted {cards_on_page} cards from page {page} of {set_slug}")

        next_button = self._find_next_button(driver)
        has_next = next_button is not None
        if has_next and cards_on_page < 24:
            retries = response.meta.get('retry_count', 0)
            if retries < 3:
                print(f"⚠️ Page {page} loaded only {cards_on_page} cards (expected 24). Retrying ({retries + 1}/3)...")
                driver.refresh()
                time.sleep(4)
                refreshed_body = str.encode(driver.page_source)
                retry_response = response.replace(body=refreshed_body)
                retry_response.meta['retry_count'] = retries + 1
                retry_response.meta['driver'] = driver
                yield from self.parse_set(retry_response)
                return
            else:
                print(f"⚠️ Page {page} still incomplete after retries; continuing.")
        
        # Pagination
        try:
            if next_button and cards_on_page > 0:
                print(f"[DEBUG] Found next page button, clicking to page {page + 1}...")
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", next_button)
                time.sleep(0.5)
                try:
                    next_button.click()
                except:
                    driver.execute_script("arguments[0].click();", next_button)
                
                time.sleep(3)
                
                # Recursively parse next page with SAME META
                body = str.encode(driver.page_source)
                next_response = response.replace(body=body)
                next_response.meta.update({
                    'driver': driver,
                    'set_slug': set_slug,
                    'set_index': set_index,
                    'page': page + 1,
                    'target_set_name': target_set_name,
                    'retry_count': 0
                })
                
                for item in self.parse_set(next_response):
                    yield item
            else:
                print(f"✓ Completed set {set_index}/{self.total_sets}: {set_slug}")
        
        except Exception as e:
            self.logger.error(f"Error checking for next page: {e}")
    
    def closed(self, reason):
        """Print final statistics"""
        print(f"\n{'='*70}")
        print(f"Scraping Complete!")
        print(f"{'='*70}")
        print(f"Total sets processed: {self.current_set_index}/{self.total_sets}")
        print(f"Total cards scraped: {self.total_cards_scraped}/{self.total_cards_target}")
        print(f"{'='*70}\n")
