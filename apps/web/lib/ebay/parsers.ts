import type { EbayItem, NormalizedTransaction } from './types';
import { EbayParseError } from './errors';
import { parsePrice } from './currency';

/**
 * Extract grading company from title
 * 
 * Detects PSA, BGS (Beckett), CGC, and SGC grading companies
 * 
 * @param title - eBay listing title
 * @returns Grading company abbreviation or null
 */
export function extractGradingCompany(title: string): string | null {
  const normalized = title.toUpperCase();
  
  if (normalized.includes('PSA')) return 'PSA';
  if (normalized.includes('BGS') || normalized.includes('BECKETT')) return 'BGS';
  if (normalized.includes('CGC')) return 'CGC';
  if (normalized.includes('SGC')) return 'SGC';
  
  return null;
}

/**
 * Extract grade (1-10) from title
 * 
 * Supports integer grades (PSA 10) and decimal grades (BGS 9.5)
 * 
 * @param title - eBay listing title
 * @returns Grade number or null if not found/invalid
 */
export function extractGrade(title: string): number | null {
  const company = extractGradingCompany(title);
  if (!company) return null;

  // Match patterns like: "PSA 10", "BGS 9.5", "GRADE 10", "10 PSA"
  const patterns = [
    /\b(PSA|BGS|CGC|SGC)\s*(\d+(?:\.\d+)?)\b/i,
    /\bGRADE\s*(\d+(?:\.\d+)?)\b/i,
    /\b(\d+(?:\.\d+)?)\s*(PSA|BGS|CGC|SGC)\b/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      // Extract the numeric part
      const gradeStr = match[1]?.match(/\d+(?:\.\d+)?/)?.[0] || match[2];
      if (!gradeStr) continue;
      
      const grade = parseFloat(gradeStr);
      
      // Validate grade is in valid range (1-10)
      if (grade >= 1 && grade <= 10) {
        return grade;
      }
    }
  }

  return null;
}

/**
 * Detect language from title
 * 
 * Identifies Japanese, Chinese, or defaults to English
 * 
 * @param title - eBay listing title
 * @returns Language code
 */
export function detectLanguage(title: string): 'jp' | 'en' | 'cn' | 'other' {
  const normalized = title.toLowerCase();
  
  // Japanese indicators
  if (
    normalized.includes('japanese') ||
    normalized.includes('japan') ||
    normalized.includes('jpn') ||
    /[\u3040-\u309F\u30A0-\u30FF]/.test(title) // Hiragana/Katakana
  ) {
    return 'jp';
  }
  
  // Chinese indicators
  if (
    normalized.includes('chinese') ||
    normalized.includes('china') ||
    /[\u4E00-\u9FFF]/.test(title) // Chinese characters (CJK Unified Ideographs)
  ) {
    return 'cn';
  }
  
  // Default to English
  // Most listings without language indicators are English
  return 'en';
}

/**
 * Extract quantity from title
 * 
 * Detects lot sizes like "3x Pikachu" or "Lot of 5"
 * 
 * @param title - eBay listing title
 * @returns Quantity (defaults to 1 for single cards)
 */
export function extractQuantity(title: string): number {
  const patterns = [
    /\b(\d+)x\b/i,           // "3x Pikachu"
    /\blot\s+of\s+(\d+)\b/i, // "Lot of 5"
    /\b(\d+)\s+cards?\b/i,   // "10 cards"
    /\b(\d+)\s+pc\b/i,       // "5 pc" (piece)
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const qty = parseInt(match[1], 10);
      // Sanity check: quantity should be reasonable (2-999, reject 1000+)
      if (qty > 1 && qty <= 999) {
        return qty;
      }
    }
  }

  return 1; // Default: single card
}

/**
 * Parse eBay item into normalized transaction
 * 
 * Extracts and normalizes all relevant fields from eBay's verbose response format
 * 
 * @param item - Raw eBay item from API response
 * @param isSoldListing - Whether this is a completed sale (true) or active listing (false)
 * @returns Normalized transaction object
 * @throws EbayParseError if required fields are missing
 */
export function parseEbayItem(
  item: EbayItem,
  isSoldListing: boolean = true
): NormalizedTransaction {
  try {
    // Extract values (eBay uses arrays for everything)
    const itemId = item.itemId?.[0];
    const title = item.title?.[0];
    const endTimeStr = item.listingInfo?.[0]?.endTime?.[0];
    const imageUrl = item.galleryURL?.[0] || null;

    // Validate required fields (price/currency validated by parsePrice)
    if (!itemId || !title || !endTimeStr) {
      throw new EbayParseError(
        'Missing required fields in eBay item',
        item
      );
    }

    // Parse price with robust currency handling
    const { originalPrice, currency, priceUsd } = parsePrice(item);

    // Validate price is positive
    if (originalPrice <= 0) {
      throw new EbayParseError(
        `Invalid price: ${originalPrice} ${currency}`,
        item
      );
    }

    // Parse date
    const soldDate = new Date(endTimeStr);
    if (isNaN(soldDate.getTime())) {
      throw new EbayParseError(
        `Invalid date value: ${endTimeStr}`,
        item
      );
    }

    // Parse grading info
    const gradingCompany = extractGradingCompany(title);
    const grade = extractGrade(title);

    // Detect language
    const language = detectLanguage(title);

    // Extract quantity
    const quantity = extractQuantity(title);

    return {
      ebay_item_id: itemId,
      card_id: null, // Will be matched later via card matching service
      title,
      price_usd: priceUsd,
      original_price: originalPrice,
      original_currency: currency,
      sold_date: soldDate,
      grading_company: gradingCompany,
      grade,
      language,
      quantity,
      image_url: imageUrl,
      is_verified_sale: isSoldListing,
      metadata: item as any, // Store full response for debugging
    };
  } catch (error) {
    if (error instanceof EbayParseError) {
      throw error;
    }
    throw new EbayParseError(
      `Failed to parse eBay item: ${error instanceof Error ? error.message : 'Unknown error'}`,
      item
    );
  }
}

/**
 * Parse array of eBay items
 * 
 * Filters out failed parses to ensure partial success
 * 
 * @param items - Array of raw eBay items
 * @param isSoldListing - Whether these are completed sales
 * @returns Array of normalized transactions (failed parses are logged and skipped)
 */
export function parseEbayItems(
  items: EbayItem[],
  isSoldListing: boolean = true
): NormalizedTransaction[] {
  const transactions: NormalizedTransaction[] = [];
  const errors: Array<{ itemId?: string; error: Error }> = [];

  for (const item of items) {
    try {
      const transaction = parseEbayItem(item, isSoldListing);
      transactions.push(transaction);
    } catch (error) {
      const itemId = item.itemId?.[0] || 'unknown';
      errors.push({
        itemId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      console.error(
        `[eBay Parser] Failed to parse item ${itemId}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  // Log summary
  if (errors.length > 0) {
    console.warn(
      `[eBay Parser] Parsed ${transactions.length}/${items.length} items successfully. ${errors.length} errors.`
    );
  }

  return transactions;
}

/**
 * Validate transaction data before database insertion
 * 
 * Performs sanity checks on parsed data
 * 
 * @param transaction - Normalized transaction
 * @returns true if valid, false otherwise
 */
export function validateTransaction(transaction: NormalizedTransaction): boolean {
  // Check required fields
  if (!transaction.ebay_item_id || !transaction.title) {
    return false;
  }

  // Check price is positive
  if (transaction.price_usd <= 0 || transaction.original_price <= 0) {
    return false;
  }

  // Check date is not in future
  if (transaction.sold_date > new Date()) {
    return false;
  }

  // Check grade is in valid range if present
  if (transaction.grade !== null && (transaction.grade < 1 || transaction.grade > 10)) {
    return false;
  }

  // Check quantity is positive
  if (transaction.quantity < 1) {
    return false;
  }

  return true;
}
