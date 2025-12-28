import { z } from 'zod';

/**
 * eBay Finding API Response Schema
 * 
 * Note: eBay uses verbose nested array structure for all fields
 * Example: itemId: ['123456789'] instead of itemId: '123456789'
 */
export const EbayItemSchema = z.object({
  itemId: z.array(z.string()),
  title: z.array(z.string()),
  sellingStatus: z.array(z.object({
    currentPrice: z.array(z.object({
      __value__: z.string(),
      '@currencyId': z.string()
    })),
    sellingState: z.array(z.string())
  })),
  listingInfo: z.array(z.object({
    endTime: z.array(z.string())
  })),
  galleryURL: z.array(z.string()).optional()
});

export const EbaySearchResponseSchema = z.object({
  findCompletedItemsResponse: z.array(z.object({
    searchResult: z.array(z.object({
      '@count': z.string(),
      item: z.array(EbayItemSchema).optional()
    }))
  }))
});

export const EbayActiveSearchResponseSchema = z.object({
  findItemsAdvancedResponse: z.array(z.object({
    searchResult: z.array(z.object({
      '@count': z.string(),
      item: z.array(EbayItemSchema).optional()
    }))
  }))
});

export type EbayItem = z.infer<typeof EbayItemSchema>;
export type EbaySearchResponse = z.infer<typeof EbaySearchResponseSchema>;
export type EbayActiveSearchResponse = z.infer<typeof EbayActiveSearchResponseSchema>;

/**
 * Normalized Transaction
 * 
 * Parsed and normalized eBay listing data ready for database insertion
 */
export interface NormalizedTransaction {
  ebay_item_id: string;
  card_id: number | null;       // Linked card (matched later via separate service)
  title: string;
  price_usd: number;             // Normalized to USD
  original_price: number;
  original_currency: string;
  sold_date: Date;
  grading_company: string | null; // PSA, BGS, CGC, SGC
  grade: number | null;          // 1-10 (or decimals like 9.5)
  language: 'jp' | 'en' | 'cn' | 'other';
  quantity: number;
  image_url: string | null;
  is_verified_sale: boolean;     // true for sold, false for active
  metadata: Record<string, any>; // Store full eBay response for debugging
}

/**
 * Search Parameters
 * 
 * Options for querying eBay Finding API
 */
export interface EbaySearchParams {
  keywords: string;
  categoryId?: string;           // 183454 = Trading Card Singles
  soldItemsOnly?: boolean;       // Default: true for completed items
  sortOrder?: 'BestMatch' | 'EndTimeSoonest' | 'PricePlusShippingLowest' | 'PricePlusShippingHighest';
  entriesPerPage?: number;       // Max: 100, Default: 100
  pageNumber?: number;           // Page number (1-based)
  itemFilter?: Array<{
    name: string;
    value: string | string[];
  }>;
}
