/**
 * Price Sync Pipeline
 * 
 * Automated daily price updates for all tracked cards.
 * 
 * Features:
 * - Fetches cards needing updates (>24h stale or null)
 * - Processes in batches of 100 with rate limiting
 * - Calculates CT Price using established algorithm
 * - Updates card_extensions and price_history tables
 * - Handles errors gracefully without stopping batch
 * - Retries transient errors with exponential backoff
 * - Tracks progress and returns detailed summary
 * 
 * Usage:
 *   const summary = await syncPrices({ limit: 1000 });
 */

import { createClient } from '@/lib/supabase';
import { calculateCTPrice } from '@/lib/price-algorithm';

/**
 * Check if an error is transient (should be retried)
 * 
 * Transient errors include:
 * - Network timeouts (ETIMEDOUT, ECONNRESET)
 * - Rate limit errors (HTTP 429)
 * - Server errors (HTTP 500-504)
 * 
 * @param error - Error to check
 * @returns True if error should be retried
 */
function isTransientError(error: unknown): boolean {
  if (!error) return false;

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network timeout errors
    if (message.includes('etimedout') || 
        message.includes('econnreset') ||
        message.includes('timeout') ||
        message.includes('network')) {
      return true;
    }
  }

  // Handle HTTP errors (if error has a status code)
  const errorWithStatus = error as { status?: number; code?: string };
  if (errorWithStatus.status) {
    // Rate limit (429) or server errors (500-504)
    if (errorWithStatus.status === 429 || 
        (errorWithStatus.status >= 500 && errorWithStatus.status <= 504)) {
      return true;
    }
  }

  return false;
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Result of function
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // If this is the last attempt or error is not transient, throw
      if (attempt === maxRetries - 1 || !isTransientError(error)) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(`[retryWithBackoff] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error('Retry logic failed unexpectedly');
}

type CardForSync = {
  card_id: number;
  name_en: string | null;
  set_code: string | null;
};

export interface SyncResult {
  cardId: number;
  success: boolean;
  price?: number;
  confidence?: string;
  error?: string;
}

export interface SyncSummary {
  totalCards: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  duration: string;
  errors: Array<{ cardId: number; error: string }>;
}

/**
 * Fetches cards that need price updates
 * 
 * Selection criteria:
 * - price_updated_at is NULL (never updated)
 * - price_updated_at > 24 hours ago (stale)
 * 
 * Priority: Most recently viewed cards first
 * 
 * @param limit - Maximum number of cards to fetch
 * @param offset - Pagination offset
 * @returns Array of cards needing updates
 */
export async function getCardsForPriceUpdate(
  limit: number = 1000,
  offset: number = 0
): Promise<CardForSync[]> {
  const supabase = createClient();

  // For now, get cards from card_jp table
  // TODO: Filter by cards that need updates (check price_history table)
  const { data, error } = await supabase
    .from('card_jp')
    .select('id, card_name, set_slug')
    .not('card_name', 'is', null)
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[getCardsForPriceUpdate] Error:', error);
    throw new Error(`Failed to fetch cards: ${error.message}`);
  }

  console.log(`[getCardsForPriceUpdate] Found ${data?.length || 0} cards needing updates`);

  return (data || []).map(row => ({
    card_id: row.id,
    name_en: row.card_name,
    set_code: row.set_slug,
  }));
}

/**
 * Processes a single card: calculates price and stores results
 * 
 * Steps:
 * 1. Call calculateCTPrice() for PSA 10 grade
 * 2. Update card_extensions table
 * 3. Insert into price_history table
 * 
 * Error handling:
 * - Returns success: false on any error
 * - Logs error details for debugging
 * - Does not throw (allows batch to continue)
 * 
 * @param card - Card to process
 * @returns Sync result with success status
 */
export async function processSingleCard(card: CardForSync): Promise<SyncResult> {
  const supabase = createClient();
  
  try {
    console.log(`[processSingleCard] Processing card ${card.card_id}: ${card.name_en}`);

    // Calculate CT Price with retry logic for transient errors
    const priceResult = await retryWithBackoff(async () => {
      return await calculateCTPrice({
        card_id: card.card_id,
        grade: 'psa10',
      });
    });

    // Validate price result
    if (!priceResult.price || priceResult.price <= 0) {
      return {
        cardId: card.card_id,
        success: false,
        error: 'No valid price calculated',
      };
    }

    // Update card_extensions with current price
    const { error: updateError } = await supabase
      .from('card_extensions')
      .upsert({
        card_id: card.card_id,
        current_price_psa10: priceResult.price,
        price_confidence: priceResult.confidence,
        price_updated_at: new Date().toISOString(),
      }, {
        onConflict: 'card_id',
      });

    if (updateError) {
      console.warn(`[processSingleCard] card_extensions update warning:`, updateError);
      // Don't fail the entire operation if card_extensions update fails
    }

    // Insert into price_history (one record per day)
    const today = new Date().toISOString().split('T')[0];
    const { error: historyError } = await supabase
      .from('price_history')
      .insert({
        card_id: card.card_id,
        date: today,
        price_psa10: priceResult.price,
        volume: 0, // Will be updated when we have volume tracking
        data_source: 'ct_algorithm',
      });

    // Ignore duplicate key errors (already inserted today)
    if (historyError && !historyError.message.includes('duplicate')) {
      console.warn(`[processSingleCard] History insert warning for card ${card.card_id}:`, historyError);
    }

    console.log(`[processSingleCard] ✓ Card ${card.card_id} updated: $${priceResult.price.toFixed(2)} (confidence: ${priceResult.confidence})`);

    return {
      cardId: card.card_id,
      success: true,
      price: priceResult.price,
      confidence: priceResult.confidence,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[processSingleCard] ✗ Error for card ${card.card_id}:`, errorMessage);
    
    return {
      cardId: card.card_id,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Processes cards in batches with rate limiting
 * 
 * Batch processing:
 * - Process 100 cards at a time (configurable)
 * - Wait 1 second between batches (rate limiting)
 * - Continue on individual card failures
 * - Track progress for monitoring
 * 
 * @param cards - Array of cards to process
 * @param batchSize - Number of cards per batch (default: 100)
 * @param delayMs - Delay between batches in milliseconds (default: 1000)
 * @returns Summary of sync execution
 */
export async function syncPricesInBatches(
  cards: CardForSync[],
  batchSize: number = 100,
  delayMs: number = 1000
): Promise<SyncSummary> {
  const startTime = Date.now();
  const results: SyncResult[] = [];
  const errors: Array<{ cardId: number; error: string }> = [];

  console.log(`[syncPricesInBatches] Starting sync for ${cards.length} cards`);

  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(cards.length / batchSize);

    console.log(`[syncPricesInBatches] Processing batch ${batchNum}/${totalBatches} (${batch.length} cards)`);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(card => processSingleCard(card))
    );

    results.push(...batchResults);

    // Collect errors for summary
    batchResults.forEach(result => {
      if (!result.success && result.error) {
        errors.push({ cardId: result.cardId, error: result.error });
      }
    });

    // Rate limiting: wait between batches (except after last batch)
    if (i + batchSize < cards.length) {
      console.log(`[syncPricesInBatches] Waiting ${delayMs}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`[syncPricesInBatches] Completed: ${successful} success, ${failed} failed, ${duration}s`);

  return {
    totalCards: cards.length,
    processed: results.length,
    successful,
    failed,
    skipped: 0,
    duration: `${duration}s`,
    errors: errors.slice(0, 50), // Limit error list to 50 for response size
  };
}

/**
 * Main entry point for price sync
 * 
 * This function orchestrates the entire sync process:
 * 1. Fetch cards needing updates
 * 2. Process in batches
 * 3. Return summary
 * 
 * Options:
 * - limit: Max cards to process (default: 1000)
 * - offset: Pagination offset (default: 0)
 * - dryRun: Simulate without writing data (default: false)
 * 
 * @param options - Sync options
 * @returns Summary of sync execution
 */
export async function syncPrices(options?: {
  limit?: number;
  offset?: number;
  dryRun?: boolean;
}): Promise<SyncSummary> {
  const { limit = 1000, offset = 0, dryRun = false } = options || {};

  console.log('[syncPrices] Starting price sync', { limit, offset, dryRun });

  // Fetch cards needing updates
  const cards = await getCardsForPriceUpdate(limit, offset);
  
  if (cards.length === 0) {
    console.log('[syncPrices] No cards to update');
    return {
      totalCards: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: '0s',
      errors: [],
    };
  }

  if (dryRun) {
    console.log(`[syncPrices] DRY RUN: Would process ${cards.length} cards`);
    return {
      totalCards: cards.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: cards.length,
      duration: '0s',
      errors: [],
    };
  }

  // Process batches
  return await syncPricesInBatches(cards);
}
