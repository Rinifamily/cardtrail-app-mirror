/**
 * Rankings Feature Type Definitions
 * Phase 04 - Task 01
 * 
 * Defines types for the rankings leaderboard system including
 * ranking categories, filters, and card data structures.
 */

export type RankingCategory = 'gainers' | 'fallers' | 'volume' | 'popularity';
export type Timeframe = '24h' | '7d' | '30d';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'holo_rare' | 'ultra_rare' | 'secret_rare';
export type Grade = 'PSA 10' | 'PSA 9' | 'PSA 8' | 'BGS 10' | 'BGS 9.5' | 'CGC 10';
export type Language = 'en' | 'ja';

/**
 * Core ranking card data returned from RPC functions
 */
export interface RankingCard {
  rank: number;
  cardId: string;
  cardName: string;
  cardNameJa: string;
  thumbnailUrl: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume?: number;
  transactionCount?: number;
  rarity: string;
  language?: string;
}

/**
 * Filter state for rankings queries
 */
export interface RankingsFilters {
  category: RankingCategory;
  timeframe: Timeframe;
  rarity?: Rarity;
  grade?: string;  // Allow any grade string from URL params
  language?: Language;
}

/**
 * Raw database response from RPC functions
 */
export interface RankingCardDB {
  card_id: number;
  card_name: string;
  card_name_ja: string;
  image_urls: string;
  rarity: string;
  current_price: number;
  price_change: number | null;
  price_change_percent: number | null;
  volume?: number;
  transaction_count?: number;
}

/**
 * Comparison drawer state
 */
export interface ComparisonState {
  selectedCards: RankingCard[];
  maxSelections: number;
}

/**
 * Share data structure
 */
export interface ShareData {
  title: string;
  text: string;
  url: string;
}

/**
 * Rankings page props
 */
export interface RankingsPageProps {
  searchParams: {
    category?: string;
    timeframe?: string;
    rarity?: string;
    grade?: string;
    language?: string;
  };
}

/**
 * Utility type guards
 */
export function isValidCategory(value: string): value is RankingCategory {
  return ['gainers', 'fallers', 'volume', 'popularity'].includes(value);
}

export function isValidTimeframe(value: string): value is Timeframe {
  return ['24h', '7d', '30d'].includes(value);
}

export function isValidRarity(value: string): value is Rarity {
  return ['common', 'uncommon', 'rare', 'holo_rare', 'ultra_rare', 'secret_rare'].includes(value);
}

export function isValidLanguage(value: string): value is Language {
  return ['en', 'ja'].includes(value);
}
