/**
 * Database Types (Phase 01)
 * 
 * These types are manually created for Phase 01 tables.
 * After migration is applied, regenerate with: pnpm db:types
 * 
 * Types match the schema defined in:
 * supabase/migrations/20251205000000_core_public_tables.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sets_jp: {
        Row: {
          set_slug: string
          set_name: string
          release_date?: string | null
          logo_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          set_slug: string
          set_name: string
          release_date?: string | null
          logo_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          set_slug?: string
          set_name?: string
          release_date?: string | null
          logo_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      price_history: {
        Row: {
          id: number
          card_id: number
          date: string
          price_raw: number | null
          price_psa9: number | null
          price_psa10: number | null
          volume: number
          data_source: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          card_id: number
          date: string
          price_raw?: number | null
          price_psa9?: number | null
          price_psa10?: number | null
          volume?: number
          data_source?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          card_id?: number
          date?: string
          price_raw?: number | null
          price_psa9?: number | null
          price_psa10?: number | null
          volume?: number
          data_source?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_card_id_fkey"
            columns: ["card_id"]
            referencedRelation: "card_jp"
            referencedColumns: ["id"]
          }
        ]
      }
      market_indices: {
        Row: {
          id: number
          date: string
          index_type: string
          value: number
          change_24h: number | null
          change_7d: number | null
          volume: number | null
          created_at: string
        }
        Insert: {
          id?: number
          date: string
          index_type: string
          value: number
          change_24h?: number | null
          change_7d?: number | null
          volume?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          date?: string
          index_type?: string
          value?: number
          change_24h?: number | null
          change_7d?: number | null
          volume?: number | null
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: number
          card_id: number | null
          ebay_item_id: string
          title: string | null
          price: number
          currency: string
          sold_date: string | null
          condition: string | null
          grade: string | null
          grading_company: string | null
          seller: string | null
          is_outlier: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          card_id?: number | null
          ebay_item_id: string
          title?: string | null
          price: number
          currency?: string
          sold_date?: string | null
          condition?: string | null
          grade?: string | null
          grading_company?: string | null
          seller?: string | null
          is_outlier?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          card_id?: number | null
          ebay_item_id?: string
          title?: string | null
          price?: number
          currency?: string
          sold_date?: string | null
          condition?: string | null
          grade?: string | null
          grading_company?: string | null
          seller?: string | null
          is_outlier?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            referencedRelation: "card_jp"
            referencedColumns: ["id"]
          }
        ]
      }
      card_jp: {
        Row: {
          id: number
          card_name: string
          set_name: string
          set_slug: string
          card_index: string | null
          rarity: string | null
          image_urls: string | null
          product_slug: string | null
          product_id: string | null
        }
        Insert: {
          id?: number
          card_name: string
          set_name: string
          set_slug: string
          card_index?: string | null
          rarity?: string | null
          image_urls?: string | null
          product_slug?: string | null
          product_id?: string | null
        }
        Update: {
          id?: number
          card_name?: string
          set_name?: string
          set_slug?: string
          card_index?: string | null
          rarity?: string | null
          image_urls?: string | null
          product_slug?: string | null
          product_id?: string | null
        }
        Relationships: []
      }
      card_extensions: {
        Row: {
          card_id: number
          current_price_raw: number | null
          current_price_psa8: number | null
          current_price_psa9: number | null
          current_price_psa10: number | null
          current_price_bgs9_5: number | null
          current_price_cgc9_5: number | null
          price_updated_at: string | null
          price_confidence: string | null
          view_count: number
          last_viewed_at: string | null
          watchlist_count: number
          collection_count: number
          popularity_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          card_id: number
          current_price_raw?: number | null
          current_price_psa8?: number | null
          current_price_psa9?: number | null
          current_price_psa10?: number | null
          current_price_bgs9_5?: number | null
          current_price_cgc9_5?: number | null
          price_updated_at?: string | null
          price_confidence?: string | null
          view_count?: number
          last_viewed_at?: string | null
          watchlist_count?: number
          collection_count?: number
          popularity_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          card_id?: number
          current_price_raw?: number | null
          current_price_psa8?: number | null
          current_price_psa9?: number | null
          current_price_psa10?: number | null
          current_price_bgs9_5?: number | null
          current_price_cgc9_5?: number | null
          price_updated_at?: string | null
          price_confidence?: string | null
          view_count?: number
          last_viewed_at?: string | null
          watchlist_count?: number
          collection_count?: number
          popularity_score?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_extensions_card_id_fkey"
            columns: ["card_id"]
            referencedRelation: "card_jp"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_price_gainers: {
        Args: {
          timeframe_param?: string
          limit_count?: number
          rarity_filter?: string | null
          grade_filter?: string | null
          language_filter?: string | null
        }
        Returns: Array<{
          card_id: number
          card_name: string
          card_name_ja: string
          image_urls: string
          rarity: string
          current_price: number
          price_change: number
          price_change_percent: number
          volume: number
        }>
      }
      get_price_fallers: {
        Args: {
          timeframe_param?: string
          limit_count?: number
          rarity_filter?: string | null
          grade_filter?: string | null
          language_filter?: string | null
        }
        Returns: Array<{
          card_id: number
          card_name: string
          card_name_ja: string
          image_urls: string
          rarity: string
          current_price: number
          price_change: number
          price_change_percent: number
          volume: number
        }>
      }
      get_volume_leaders: {
        Args: {
          timeframe_param?: string
          limit_count?: number
          rarity_filter?: string | null
          grade_filter?: string | null
          language_filter?: string | null
        }
        Returns: Array<{
          card_id: number
          card_name: string
          card_name_ja: string
          image_urls: string
          rarity: string
          current_price: number
          price_change: number
          price_change_percent: number
          volume: number
        }>
      }
      get_popularity_rankings: {
        Args: {
          timeframe_param?: string
          limit_count?: number
          rarity_filter?: string | null
          grade_filter?: string | null
          language_filter?: string | null
        }
        Returns: Array<{
          card_id: number
          card_name: string
          card_name_ja: string
          image_urls: string
          rarity: string
          current_price: number
          price_change: number
          price_change_percent: number
          transaction_count: number
        }>
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
