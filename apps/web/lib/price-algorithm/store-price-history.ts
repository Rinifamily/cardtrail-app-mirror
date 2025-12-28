/**
 * Store CT Price in price_history table
 * 
 * This creates a historical record for charts and trend analysis.
 */

import { createClient } from '@/lib/supabase';
import type { CTPriceResult } from './types';

/**
 * Store CT Price in price_history table
 * 
 * Creates a daily price record for historical tracking.
 * Used for price charts and trend analysis.
 * 
 * @param card_id - Card ID
 * @param grade - Grade type
 * @param result - CT Price calculation result
 */
export async function storePriceHistory(
  card_id: number,
  grade: string,
  result: CTPriceResult
): Promise<void> {
  if (result.price === null) {
    console.log(`[Price History] Skipping null price for card ${card_id}`);
    return;
  }

  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Map grade to appropriate column
  const gradeColumn = mapGradeToColumn(grade);
  if (!gradeColumn) {
    console.warn(`[Price History] Unknown grade: ${grade}`);
    return;
  }

  try {
    // Check if record exists for today
    const { data: existing } = await supabase
      .from('price_history')
      .select('id')
      .eq('card_id', card_id)
      .eq('date', today)
      .single();

    const priceData = {
      [gradeColumn]: result.price,
      volume: result.sample_size,
      data_source: 'ebay',
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('price_history')
        .update(priceData)
        .eq('id', existing.id);

      if (error) {
        console.error('[Price History] Error updating record:', error);
      } else {
        console.log(
          `[Price History] Updated price for card ${card_id}, ${grade}: ${result.price}`
        );
      }
    } else {
      // Insert new record
      const { error } = await supabase.from('price_history').insert({
        card_id,
        date: today,
        ...priceData,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[Price History] Error inserting record:', error);
      } else {
        console.log(
          `[Price History] Stored new price for card ${card_id}, ${grade}: ${result.price}`
        );
      }
    }
  } catch (error) {
    console.error('[Price History] Error storing record:', error);
  }
}

/**
 * Map grade type to price_history column
 * 
 * @param grade - Grade type (e.g., "psa10", "raw")
 * @returns Column name or null if unknown
 */
function mapGradeToColumn(
  grade: string
): 'price_raw' | 'price_psa9' | 'price_psa10' | null {
  const normalized = grade.toLowerCase();

  if (normalized === 'raw') return 'price_raw';
  if (normalized === 'psa9') return 'price_psa9';
  if (normalized === 'psa10') return 'price_psa10';

  // For other grades, use closest match
  if (normalized.includes('psa10') || normalized === 'bgs10' || normalized === 'cgc10') {
    return 'price_psa10';
  }
  if (normalized.includes('psa9') || normalized === 'bgs9' || normalized === 'cgc9') {
    return 'price_psa9';
  }
  if (normalized.includes('psa8') || normalized.includes('psa7')) {
    return 'price_raw'; // Store lower grades in raw column for now
  }

  return null;
}

/**
 * Get price history for a card
 * 
 * @param card_id - Card ID
 * @param days - Number of days to retrieve (default: 30)
 * @returns Array of price history records
 */
export async function getPriceHistory(
  card_id: number,
  days: number = 30
): Promise<any[]> {
  const supabase = createClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('card_id', card_id)
    .gte('date', cutoffDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.error('[Price History] Error fetching history:', error);
    return [];
  }

  return data || [];
}
