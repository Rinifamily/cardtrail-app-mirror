"""
Database service for managing card_jp table operations
"""
import os
import re
from typing import List, Dict, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


class DatabaseService:
    """Service for database operations on card_jp table"""
    
    def __init__(self):
        self.supabase = self._get_client()
    
    @staticmethod
    def _get_client() -> Client:
        """Get Supabase client"""
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        if not supabase_url or not supabase_key:
            raise RuntimeError("Supabase credentials not found in .env file")
        return create_client(supabase_url, supabase_key)
    
    def clear_and_reset(self) -> None:
        """Clear card_jp table and reset ID sequence"""
        print("🗑️  Clearing card_jp table and resetting ID sequence...")
        self.supabase.rpc('truncate_card_jp').execute()
        print("✅ Database cleared and ID reset to 1")
    
    def get_card_count(self) -> int:
        """Get total count of cards in card_jp"""
        response = self.supabase.table('card_jp').select('id', count='exact').limit(1).execute()
        return response.count or 0
    
    def get_set_card_counts(self) -> Dict[str, int]:
        """Get card counts grouped by set_slug"""
        print("📊 Counting cards by set...")
        slug_counts = {}
        page = 0
        page_size = 1000
        
        while True:
            response = self.supabase.table('card_jp').select('set_slug').range(
                page * page_size, (page + 1) * page_size - 1
            ).execute()
            data = response.data
            
            if not data:
                break
                
            for row in data:
                slug = row.get('set_slug')
                if slug:
                    slug_counts[slug] = slug_counts.get(slug, 0) + 1
            
            if len(data) < page_size:
                break
            page += 1
            
            if page % 5 == 0:
                print(f"  Processed {page * page_size} cards...")
        
        return slug_counts
    
    def update_set_slugs(self) -> Dict[str, any]:
        """Update set_slug for all cards in card_jp based on set_name"""
        print("🔄 Updating set slugs...")
        
        # 1. Load reference sets
        response = self.supabase.table('sets_jp').select('set_name, set_slug, display_name').execute()
        sets_data = response.data
        
        # Create slug mapping
        slug_map = {}
        for item in sets_data:
            slug = item.get('set_slug')
            if not slug:
                continue
            
            # Map from set_name (normalized)
            norm_set_name = self._normalize_name(item['set_name'])
            slug_map[norm_set_name] = slug
            
            # Map from display_name (normalized)
            if item.get('display_name'):
                norm_display_name = self._normalize_name(item['display_name'])
                slug_map[norm_display_name] = slug
        
        print(f"✓ Loaded {len(sets_data)} reference sets")
        
        # 2. Get all unique set names from card_jp
        unique_set_names = self._fetch_all_card_jp_sets()
        print(f"✓ Found {len(unique_set_names)} distinct set names in card_jp")
        
        # 3. Update slugs
        matched_count = 0
        unmatched = []
        
        for set_name in unique_set_names:
            norm_name = self._normalize_name(set_name)
            slug = slug_map.get(norm_name)
            
            if slug:
                self.supabase.table('card_jp').update({'set_slug': slug}).eq('set_name', set_name).execute()
                matched_count += 1
            else:
                unmatched.append(set_name)
        
        return {
            'matched': matched_count,
            'unmatched': unmatched,
            'total': len(unique_set_names)
        }
    
    def generate_missing_cards_report(self, output_file: str = 'missing_cards_report.txt') -> List[Dict]:
        """Generate report of sets with missing cards"""
        print("📋 Generating missing cards report...")
        
        # Get expected counts from sets_jp
        response = self.supabase.table('sets_jp').select('set_name, set_slug, card_count, display_name').execute()
        sets_data = response.data
        
        expected_counts = {}
        for item in sets_data:
            slug = item.get('set_slug')
            if slug:
                expected_counts[slug] = {
                    'set_name': item.get('display_name') or item.get('set_name'),
                    'expected': item.get('card_count', 0)
                }
        
        # Get actual counts from card_jp
        actual_counts = self.get_set_card_counts()
        
        # Compare and find discrepancies
        discrepancies = []
        for slug, info in expected_counts.items():
            expected = info['expected'] or 0
            actual = actual_counts.get(slug, 0)
            
            if actual != expected:
                discrepancies.append({
                    'set_name': info['set_name'],
                    'slug': slug,
                    'expected': expected,
                    'actual': actual,
                    'diff': expected - actual
                })
        
        # Sort by diff (most missing first)
        discrepancies.sort(key=lambda x: x['diff'], reverse=True)
        
        # Write report
        with open(output_file, 'w') as f:
            header = f"{'Set Name':<50} | {'Slug':<30} | {'Exp':<5} | {'Act':<5} | {'Diff':<5}"
            divider = "-" * 105
            f.write(header + '\n')
            f.write(divider + '\n')
            
            for d in discrepancies:
                if d['diff'] != 0:
                    line = f"{d['set_name'][:50]:<50} | {d['slug'][:30]:<30} | {d['expected']:<5} | {d['actual']:<5} | {d['diff']:<5}"
                    f.write(line + '\n')
        
        print(f"✅ Report saved to {output_file}")
        return discrepancies
    
    def _normalize_name(self, name: str) -> str:
        """Normalize set name for comparison"""
        if not name:
            return ""
        return re.sub(r'[^a-zA-Z0-9]', '', name).lower()
    
    def _fetch_all_card_jp_sets(self) -> List[str]:
        """Fetch all distinct set names from card_jp"""
        all_sets = set()
        page = 0
        page_size = 1000
        
        while True:
            response = self.supabase.table('card_jp').select('set_name').range(
                page * page_size, (page + 1) * page_size - 1
            ).execute()
            data = response.data
            
            if not data:
                break
            
            for row in data:
                if row.get('set_name'):
                    all_sets.add(row['set_name'])
            
            if len(data) < page_size:
                break
            page += 1
        
        return list(all_sets)

