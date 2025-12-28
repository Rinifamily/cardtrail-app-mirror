/**
 * Type definitions for CT Price calculation algorithm
 */

/**
 * Input parameters for CT Price calculation
 */
export interface CTPriceParams {
  card_id: number;
  grade: GradeType;
  language?: LanguageCode;
  lookback_days?: number; // Default: 90
  force_refresh?: boolean; // Bypass cache
}

/**
 * Grade types supported
 */
export type GradeType =
  | 'raw'
  | 'psa7'
  | 'psa8'
  | 'psa9'
  | 'psa10'
  | 'bgs9'
  | 'bgs9_5'
  | 'bgs10'
  | 'cgc9_5'
  | 'cgc10'
  | 'sgc8'
  | 'sgc8_5'
  | 'sgc9'
  | 'sgc9_5'
  | 'sgc10';

/**
 * Language codes
 */
export type LanguageCode = 'jp' | 'en' | 'cn' | null;

/**
 * Confidence level
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Transaction metadata from database JSONB field
 */
export interface TransactionMetadata {
  language?: LanguageCode;
  is_active_listing?: boolean;
  listing_type?: string;
  quantity?: number;
  [key: string]: unknown;
}

/**
 * Raw transaction data from database
 */
export interface RawTransactionData {
  ebay_item_id: string;
  card_id: number | null;
  title: string | null;
  price: string | number;
  currency: string | null;
  sold_date: string | null;
  grading_company: string | null;
  grade: string | null;
  metadata: TransactionMetadata | null;
  created_at: string;
}

/**
 * Transaction data structure (from database)
 */
export interface TransactionData {
  ebay_item_id: string;
  card_id: number | null;
  title: string | null;
  price: number;
  currency: string;
  sold_date: Date;
  grading_company: string | null;
  grade: string | null;
  quantity: number;
  language: LanguageCode;
  is_verified_sale: boolean;
  listing_type: string | null;
  created_at: Date;
}

/**
 * Weighted transaction (after weight calculation)
 */
export interface WeightedTransaction extends TransactionData {
  weight: number;
  recency_weight: number;
  volume_weight: number;
  quality_weight: number;
}

/**
 * CT Price calculation result
 */
export interface CTPriceResult {
  price: number | null;
  confidence: ConfidenceLevel;
  sample_size: number;
  weighted_sample_size: number;
  last_sale_date: Date | null;
  price_range: {
    min: number;
    max: number;
  } | null;
  calculation_date: Date;
  outliers_removed: number;
  is_estimated: boolean; // True if estimated from another grade
  estimated_from?: GradeType;
  volatility_warning?: boolean;
  message?: string;
}

/**
 * Outlier detection result
 */
export interface OutlierDetectionResult {
  filtered: TransactionData[];
  outliers: TransactionData[];
  bounds: {
    lower: number;
    upper: number;
  };
  q1: number;
  q3: number;
  iqr: number;
}
