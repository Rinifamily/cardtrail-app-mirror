/**
 * Main CT Price calculation algorithm
 * 
 * Algorithm steps:
 * 1. Collect transaction data from database
 * 2. Remove statistical outliers (IQR method)
 * 3. Calculate weights (recency, volume, quality)
 * 4. Calculate weighted average
 * 5. Determine confidence level
 * 6. Handle edge cases (no data, sparse data, volatility)
 */

import { createClient } from '@/lib/supabase';
import type {
  CTPriceParams,
  CTPriceResult,
  TransactionData,
  RawTransactionData,
} from './types';
import { removeOutliers } from './outlier-removal';
import { calculateWeights } from './weight-calculation';
import { determineConfidence } from './confidence-determination';
import { daysBetween, standardDeviation, roundTo } from './utils';

/**
 * Calculate CT Price for a card
 * 
 * This is the main entry point for the CT Price algorithm.
 * 
 * @param params - Calculation parameters
 * @returns CT Price result with metadata
 */
export async function calculateCTPrice(
  params: CTPriceParams
): Promise<CTPriceResult> {
  const {
    card_id,
    grade,
    language = null,
    lookback_days = 90,
  } = params;

  console.log(`[CT Price] Calculating for card ${card_id}, grade ${grade}`);

  // Step 1: Collect transaction data
  let transactions = await collectTransactionData(
    card_id,
    grade,
    lookback_days
  );

  // Filter by language if specified
  if (language) {
    const languageTransactions = transactions.filter(
      (t) => t.language === language
    );

    // Use language-specific data if sufficient
    if (languageTransactions.length >= 5) {
      transactions = languageTransactions;
      console.log(
        `[CT Price] Using ${languageTransactions.length} ${language} transactions`
      );
    } else {
      console.log(
        `[CT Price] Insufficient ${language} transactions (${languageTransactions.length}), using all languages`
      );
    }
  }

  // Handle sparse data: expand lookback window
  if (transactions.length < 5 && lookback_days < 180) {
    console.log(`[CT Price] Sparse data, expanding to 180 days`);
    transactions = await collectTransactionData(card_id, grade, 180);
  }

  // Handle no data case
  if (transactions.length === 0) {
    return {
      price: null,
      confidence: 'low',
      sample_size: 0,
      weighted_sample_size: 0,
      last_sale_date: null,
      price_range: null,
      calculation_date: new Date(),
      outliers_removed: 0,
      is_estimated: false,
      message: 'No recent sales data available for this card',
    };
  }

  // Step 2: Remove outliers
  const { filtered, outliers } = removeOutliers(transactions);

  if (filtered.length === 0) {
    return {
      price: null,
      confidence: 'low',
      sample_size: transactions.length,
      weighted_sample_size: 0,
      last_sale_date: null,
      price_range: null,
      calculation_date: new Date(),
      outliers_removed: outliers.length,
      is_estimated: false,
      message: 'All transactions were outliers',
    };
  }

  // Step 3: Apply weights
  const weightedTransactions = calculateWeights(filtered);

  // Step 4: Check for high volatility
  const prices = weightedTransactions.map((t) => t.price);
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const stdDev = standardDeviation(prices);
  const coefficientOfVariation = stdDev / mean;

  // If highly volatile, use median instead of weighted average
  if (coefficientOfVariation > 0.3) {
    console.log(
      `[CT Price] High volatility detected (CV: ${coefficientOfVariation.toFixed(2)})`
    );

    const sortedPrices = [...prices].sort((a, b) => a - b);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];

    const lastSaleDate = weightedTransactions.reduce(
      (latest, t) => (t.sold_date > latest ? t.sold_date : latest),
      weightedTransactions[0].sold_date
    );

    return {
      price: roundTo(medianPrice),
      confidence: 'medium',
      sample_size: filtered.length,
      weighted_sample_size: filtered.length,
      last_sale_date: lastSaleDate,
      price_range: {
        min: Math.min(...prices),
        max: Math.max(...prices),
      },
      calculation_date: new Date(),
      outliers_removed: outliers.length,
      is_estimated: false,
      volatility_warning: true,
      message: 'Price is highly volatile. Showing median price.',
    };
  }

  // Step 5: Calculate weighted average
  const totalWeightedPrice = weightedTransactions.reduce(
    (sum, t) => sum + t.price * t.weight,
    0
  );
  const totalWeight = weightedTransactions.reduce(
    (sum, t) => sum + t.weight,
    0
  );

  const price = totalWeightedPrice / totalWeight;

  // Calculate price range
  const priceRange = {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };

  // Find most recent sale
  const lastSaleDate = weightedTransactions.reduce(
    (latest, t) => (t.sold_date > latest ? t.sold_date : latest),
    weightedTransactions[0].sold_date
  );

  // Step 6: Determine confidence level
  const daysSinceLastSale = daysBetween(lastSaleDate, new Date());
  const confidence = determineConfidence(
    filtered.length,
    totalWeight,
    daysSinceLastSale
  );

  console.log(
    `[CT Price] Calculated: ${roundTo(price)} (${filtered.length} transactions, confidence: ${confidence})`
  );

  return {
    price: roundTo(price),
    confidence,
    sample_size: filtered.length,
    weighted_sample_size: roundTo(totalWeight),
    last_sale_date: lastSaleDate,
    price_range: priceRange,
    calculation_date: new Date(),
    outliers_removed: outliers.length,
    is_estimated: false,
  };
}

/**
 * Collect transaction data from database
 * 
 * @param card_id - Card ID
 * @param grade - Target grade
 * @param lookback_days - Number of days to look back
 * @returns Array of transaction data
 */
async function collectTransactionData(
  card_id: number,
  grade: string,
  lookback_days: number
): Promise<TransactionData[]> {
  const supabase = createClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookback_days);

  // Query transactions table
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('card_id', card_id)
    .gte('sold_date', cutoffDate.toISOString())
    .order('sold_date', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[CT Price] Error fetching transactions:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Filter by grade match and map to TransactionData
  const filtered = (data as RawTransactionData[])
    .filter((t) => matchesGrade(t, grade))
    .map((t): TransactionData => {
      // Extract quantity from metadata or title
      const quantity = extractQuantity(t);
      const totalPrice = Number(t.price);
      
      // Calculate per-unit price for bulk sales
      const unitPrice = quantity > 1 ? totalPrice / quantity : totalPrice;
      
      return {
        ebay_item_id: t.ebay_item_id,
        card_id: t.card_id,
        title: t.title,
        price: unitPrice, // Use per-unit price
        currency: t.currency || 'USD',
        sold_date: new Date(t.sold_date || t.created_at),
        grading_company: t.grading_company,
        grade: t.grade,
        quantity, // Actual quantity extracted
        language: t.metadata?.language || null,
        is_verified_sale: !(t.metadata?.is_active_listing ?? false),
        listing_type: t.metadata?.listing_type || null,
        created_at: new Date(t.created_at),
      };
    });

  console.log(
    `[CT Price] Found ${filtered.length} transactions (${lookback_days} days)`
  );

  return filtered;
}

/**
 * Extract quantity from transaction data
 * 
 * Tries to extract from:
 * 1. Metadata field (if stored)
 * 2. Title parsing (e.g., "Lot of 50", "x10", "50x")
 * 
 * @param transaction - Raw transaction data
 * @returns Quantity (default: 1)
 */
function extractQuantity(transaction: RawTransactionData): number {
  // First try metadata
  if (transaction.metadata?.quantity && transaction.metadata.quantity > 0) {
    return transaction.metadata.quantity;
  }

  // Try parsing from title
  const title = transaction.title?.toLowerCase() || '';
  
  // Pattern: "lot of 50", "50 card lot", "qty: 50"
  const lotMatch = title.match(/(?:lot of|qty:?|quantity:?)\s*(\d+)/i);
  if (lotMatch) {
    return parseInt(lotMatch[1], 10);
  }

  // Pattern: "x10", "x 10", "10x", "10 x"
  const xMatch = title.match(/[x×]\s*(\d+)|(\d+)\s*[x×]/i);
  if (xMatch) {
    return parseInt(xMatch[1] || xMatch[2], 10);
  }

  // Pattern: "(50)", "[50]"
  const parenMatch = title.match(/[\(\[](\d+)[\)\]]/);
  if (parenMatch && parseInt(parenMatch[1], 10) > 1) {
    return parseInt(parenMatch[1], 10);
  }

  // Default to 1 (single card)
  return 1;
}

/**
 * Check if transaction matches target grade
 * 
 * @param transaction - Transaction from database
 * @param targetGrade - Target grade (e.g., "psa10", "raw")
 * @returns True if matches
 */
function matchesGrade(transaction: RawTransactionData, targetGrade: string): boolean {
  const grade = transaction.grade?.toLowerCase();
  const company = transaction.grading_company?.toLowerCase();

  // Raw cards
  if (targetGrade === 'raw') {
    return !company && !grade;
  }

  // Parse target grade (e.g., "psa10" → company="psa", grade=10)
  const match = targetGrade.match(/^([a-z]+)(\d+(?:[._]\d+)?)$/i);
  if (!match) return false;

  const [, targetCompany, targetGradeNum] = match;
  const targetGradeValue = parseFloat(targetGradeNum.replace('_', '.'));

  // Check if transaction matches
  if (company === targetCompany.toLowerCase()) {
    // Try to parse grade from both grade field and from grade string
    let gradeValue: number | null = null;

    if (typeof grade === 'string') {
      // Extract numeric grade from string (e.g., "10" or "9.5")
      const gradeMatch = grade.match(/(\d+(?:\.\d+)?)/);
      if (gradeMatch) {
        gradeValue = parseFloat(gradeMatch[1]);
      }
    }

    if (gradeValue !== null) {
      return Math.abs(gradeValue - targetGradeValue) < 0.1;
    }
  }

  return false;
}
