"""
Supabase Pipeline for TCGPlayer Pokemon Japan cards
"""
import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class TCGPlayerPipeline:
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.supabase = None
        self.inserted_count = 0
        self.updated_count = 0
        self.error_count = 0
    
    def open_spider(self, spider):
        """Initialize Supabase connection when spider opens"""
        try:
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_KEY')
            
            if not supabase_url or not supabase_key:
                self.logger.error("Supabase credentials not found in environment variables")
                raise ValueError("Missing Supabase credentials")
            
            self.supabase: Client = create_client(supabase_url, supabase_key)
            print("✓ Successfully connected to Supabase")
            
        except Exception as e:
            self.logger.error(f"Failed to connect to Supabase: {e}")
            raise
    
    def process_item(self, item, spider):
        """Process and insert item into Supabase card_jp table"""
        try:
            _ = spider  # satisfy interface / lint
            # Extract data
            info = item.get('info', '').strip()
            card_name = item.get('card_name', '').strip()
            set_slug = item.get('set_slug', '').strip()
            card_index = item.get('card_index', '').strip()
            
            if not info or not card_name:
                self.logger.warning(f"Skipping item without info or card_name: {item}")
                return item
            
            # Parse set_name from info
            # Expected format: "Pokemon Japan, Set Name"
            set_name = info
            if "Pokemon Japan," in info:
                set_name = info.split("Pokemon Japan,")[1].strip()
            
            # Prepare data for card_jp table
            image_urls = item.get('image_urls')
            product_slug = item.get('product_slug')
            product_id = item.get('product_id')

            card_data = {
                'card_name': card_name,
                'set_name': set_name,
                'set_slug': set_slug,
                'card_index': card_index,
                'rarity': item.get('rarity'),
                'image_urls': image_urls,
                'product_slug': product_slug,
                'product_id': product_id
            }
            
            # Insert into Supabase
            try:
                response = self.supabase.table('card_jp').insert(card_data).execute()
                if response.data:
                    self.inserted_count += len(response.data)
                    if self.inserted_count % 10 == 0:
                        print(f"💾 Saved {self.inserted_count} cards")
            except Exception as e:
                self.error_count += 1
                self.logger.error(f"Error inserting item: {e}")
            
        except Exception as e:
            if '23505' not in str(e) and '409' not in str(e):
                self.error_count += 1
                self.logger.error(f"Error processing item: {e}")
        
        return item
    
    def close_spider(self, spider):
        """Log statistics when spider closes"""
        print("\n" + "=" * 70)
        print("Supabase Pipeline Statistics")
        print("=" * 70)
        print(f"Inserted/Updated: {self.inserted_count}")
        print(f"Errors: {self.error_count}")
        print(f"Total processed: {self.inserted_count + self.error_count}")
        print("=" * 70 + "\n")

