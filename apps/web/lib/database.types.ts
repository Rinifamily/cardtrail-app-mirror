export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      card_jp: {
        Row: {
          card_index: string | null
          card_name: string
          id: number
          image_urls: string | null
          product_id: string | null
          product_slug: string | null
          rarity: string | null
          set_name: string
          set_slug: string
        }
        Insert: {
          card_index?: string | null
          card_name: string
          id?: number
          image_urls?: string | null
          product_id?: string | null
          product_slug?: string | null
          rarity?: string | null
          set_name: string
          set_slug: string
        }
        Update: {
          card_index?: string | null
          card_name?: string
          id?: number
          image_urls?: string | null
          product_id?: string | null
          product_slug?: string | null
          rarity?: string | null
          set_name?: string
          set_slug?: string
        }
        Relationships: []
      }
      card_jp_duplicate: {
        Row: {
          card_index: string | null
          card_name: string
          id: number
          image_urls: string | null
          product_id: string | null
          product_slug: string | null
          rarity: string | null
          set_name: string
          set_slug: string
        }
        Insert: {
          card_index?: string | null
          card_name: string
          id?: number
          image_urls?: string | null
          product_id?: string | null
          product_slug?: string | null
          rarity?: string | null
          set_name: string
          set_slug: string
        }
        Update: {
          card_index?: string | null
          card_name?: string
          id?: number
          image_urls?: string | null
          product_id?: string | null
          product_slug?: string | null
          rarity?: string | null
          set_name?: string
          set_slug?: string
        }
        Relationships: []
      }
      market_indices: {
        Row: {
          change_24h: number | null
          change_7d: number | null
          created_at: string | null
          date: string
          id: number
          index_type: string
          value: number
          volume: number | null
        }
        Insert: {
          change_24h?: number | null
          change_7d?: number | null
          created_at?: string | null
          date: string
          id?: number
          index_type: string
          value: number
          volume?: number | null
        }
        Update: {
          change_24h?: number | null
          change_7d?: number | null
          created_at?: string | null
          date?: string
          id?: number
          index_type?: string
          value?: number
          volume?: number | null
        }
        Relationships: []
      }
      price_history: {
        Row: {
          card_id: number
          created_at: string | null
          data_source: string | null
          date: string
          id: number
          price_psa10: number | null
          price_psa9: number | null
          price_raw: number | null
          updated_at: string | null
          volume: number | null
        }
        Insert: {
          card_id: number
          created_at?: string | null
          data_source?: string | null
          date: string
          id?: number
          price_psa10?: number | null
          price_psa9?: number | null
          price_raw?: number | null
          updated_at?: string | null
          volume?: number | null
        }
        Update: {
          card_id?: number
          created_at?: string | null
          data_source?: string | null
          date?: string
          id?: number
          price_psa10?: number | null
          price_psa9?: number | null
          price_raw?: number | null
          updated_at?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_jp"
            referencedColumns: ["id"]
          },
        ]
      }
      rarity_jp: {
        Row: {
          rarity_name: string
        }
        Insert: {
          rarity_name: string
        }
        Update: {
          rarity_name?: string
        }
        Relationships: []
      }
      sets_en: {
        Row: {
          card_count: number | null
          display_name: string | null
          set_name: string
          set_slug: string | null
        }
        Insert: {
          card_count?: number | null
          display_name?: string | null
          set_name: string
          set_slug?: string | null
        }
        Update: {
          card_count?: number | null
          display_name?: string | null
          set_name?: string
          set_slug?: string | null
        }
        Relationships: []
      }
      sets_jp: {
        Row: {
          card_count: number | null
          display_name: string | null
          set_name: string
          set_slug: string | null
        }
        Insert: {
          card_count?: number | null
          display_name?: string | null
          set_name: string
          set_slug?: string | null
        }
        Update: {
          card_count?: number | null
          display_name?: string | null
          set_name?: string
          set_slug?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          card_id: number | null
          condition: string | null
          created_at: string | null
          currency: string | null
          ebay_item_id: string
          grade: string | null
          grading_company: string | null
          id: number
          is_outlier: boolean | null
          metadata: Json | null
          price: number
          seller: string | null
          sold_date: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          card_id?: number | null
          condition?: string | null
          created_at?: string | null
          currency?: string | null
          ebay_item_id: string
          grade?: string | null
          grading_company?: string | null
          id?: number
          is_outlier?: boolean | null
          metadata?: Json | null
          price: number
          seller?: string | null
          sold_date?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          card_id?: number | null
          condition?: string | null
          created_at?: string | null
          currency?: string | null
          ebay_item_id?: string
          grade?: string | null
          grading_company?: string | null
          id?: number
          is_outlier?: boolean | null
          metadata?: Json | null
          price?: number
          seller?: string | null
          sold_date?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_jp"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
