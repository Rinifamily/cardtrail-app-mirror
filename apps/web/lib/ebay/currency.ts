/**
 * Currency handling utilities
 * 
 * Provides robust currency validation, normalization, and conversion for eBay listings.
 * Handles edge cases like missing currencies, unknown codes, and invalid values.
 */

/**
 * Supported currency codes
 * 
 * List of currencies commonly seen in eBay Pokemon TCG listings.
 * Ordered by frequency of occurrence.
 */
export const SUPPORTED_CURRENCIES = [
  'USD', // United States Dollar
  'EUR', // Euro
  'GBP', // British Pound
  'JPY', // Japanese Yen
  'AUD', // Australian Dollar
  'CAD', // Canadian Dollar
  'CHF', // Swiss Franc
  'HKD', // Hong Kong Dollar
  'SGD', // Singapore Dollar
  'NZD', // New Zealand Dollar
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Static currency conversion rates to USD
 * 
 * ⚠️ WARNING: Uses static exchange rates updated 2024-12-08.
 * These are approximate rates and WILL become stale over time.
 * 
 * **Limitations:**
 * - Exchange rates fluctuate daily (typically 1-3% variance)
 * - Static rates can become 5-10% inaccurate after weeks/months
 * - Not suitable for high-precision financial calculations
 * 
 * **Production Recommendation:**
 * Integrate real-time currency API (e.g., exchangerate-api.com) in Phase 9.
 * See README.md for implementation guide.
 * 
 * **Acceptable Use Cases:**
 * - Development and testing
 * - Approximate pricing for user display
 * - Fallback when live API is unavailable
 * 
 * **Update Schedule:** Quarterly (or when rates drift >5%)
 * 
 * @see https://www.exchangerate-api.com/ for real-time rates (1,500 free req/month)
 * @see apps/web/lib/ebay/README.md#currency-handling for integration guide
 * 
 * Last updated: 2024-12-08
 */
export const CURRENCY_TO_USD_RATES: Record<string, number> = {
  'USD': 1.0,
  'EUR': 1.08,    // 1 EUR = ~1.08 USD (Updated: 2024-12-08)
  'GBP': 1.27,    // 1 GBP = ~1.27 USD (Updated: 2024-12-08)
  'JPY': 0.0067,  // 1 JPY = ~0.0067 USD (Updated: 2024-12-08)
  'AUD': 0.64,    // 1 AUD = ~0.64 USD (Updated: 2024-12-08)
  'CAD': 0.71,    // 1 CAD = ~0.71 USD (Updated: 2024-12-08)
  'CHF': 1.13,    // 1 CHF = ~1.13 USD (Updated: 2024-12-08)
  'HKD': 0.13,    // 1 HKD = ~0.13 USD (Updated: 2024-12-08)
  'SGD': 0.74,    // 1 SGD = ~0.74 USD (Updated: 2024-12-08)
  'NZD': 0.59,    // 1 NZD = ~0.59 USD (Updated: 2024-12-08)
};

/**
 * Validate and normalize currency code
 * 
 * Ensures currency code is valid and supported. Provides fallback to USD for unknown currencies.
 * 
 * @param currency - Currency code from eBay response (may be undefined/null)
 * @param context - Context for logging (e.g., item ID)
 * @returns Normalized currency code (always valid)
 */
export function validateCurrency(
  currency: string | undefined | null,
  context?: string
): string {
  // Handle missing currency
  if (!currency) {
    console.warn(`[Currency] Missing currency${context ? ` for ${context}` : ''}, defaulting to USD`);
    return 'USD';
  }

  // Normalize to uppercase
  const normalized = currency.toUpperCase().trim();

  // Check if currency is supported
  if (!SUPPORTED_CURRENCIES.includes(normalized as any)) {
    console.warn(
      `[Currency] Unknown currency code: "${currency}"${context ? ` for ${context}` : ''}. ` +
      `Supported: ${SUPPORTED_CURRENCIES.join(', ')}. Defaulting to USD.`
    );
    return 'USD';
  }

  return normalized;
}

/**
 * Convert price from one currency to USD
 * 
 * ⚠️ WARNING: Uses static conversion rates (see CURRENCY_TO_USD_RATES).
 * Rates are approximate and updated quarterly. For production accuracy,
 * integrate a real-time exchange rate API.
 * 
 * **Accuracy:** ±5-10% depending on rate volatility and update frequency
 * 
 * @param amount - Price amount in original currency
 * @param currency - Currency code (e.g., 'JPY', 'EUR')
 * @param context - Context for logging (e.g., eBay item ID)
 * @returns Price in USD (approximate)
 * 
 * @example
 * ```typescript
 * convertToUSD(100, 'EUR', 'item-123456'); // Returns ~108 USD (approximate)
 * convertToUSD(10000, 'JPY', 'item-789');  // Returns ~67 USD (approximate)
 * ```
 */
export function convertToUSD(
  amount: number,
  currency: string,
  context?: string
): number {
  // Validate amount
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0 || !isFinite(amount)) {
    console.error(
      `[Currency] Invalid amount: ${amount}${context ? ` for ${context}` : ''}. Returning 0.`
    );
    return 0;
  }

  // Already USD
  const normalizedCurrency = validateCurrency(currency, context);
  if (normalizedCurrency === 'USD') {
    return amount;
  }

  // Get conversion rate
  const rate = CURRENCY_TO_USD_RATES[normalizedCurrency];
  if (!rate) {
    console.warn(
      `[Currency] No conversion rate for ${normalizedCurrency}${context ? ` (${context})` : ''}. ` +
      `Treating as USD (1:1).`
    );
    return amount;
  }

  // Convert to USD
  const usdAmount = amount * rate;
  
  // Log conversion for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.debug(
      `[Currency] Converted ${amount} ${normalizedCurrency} → ${usdAmount.toFixed(2)} USD ` +
      `(rate: ${rate})${context ? ` for ${context}` : ''}`
    );
  }

  return usdAmount;
}

/**
 * Extract and validate currency from eBay item
 * 
 * Handles eBay's nested response structure and multiple currency field locations.
 * 
 * @param item - Raw eBay item
 * @returns Validated currency code
 */
export function extractCurrency(item: any): string {
  // Try currentPrice currency (most common)
  let currency = item?.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'];

  // Fallback: try convertedCurrentPrice (for international listings)
  if (!currency) {
    currency = item?.sellingStatus?.[0]?.convertedCurrentPrice?.[0]?.['@currencyId'];
  }

  // Validate and return
  const itemId = item?.itemId?.[0];
  return validateCurrency(currency, itemId);
}

/**
 * Parse price with currency validation
 * 
 * Extracts price and ensures currency is valid before conversion.
 * 
 * @param item - Raw eBay item
 * @returns Object with originalPrice, currency, and priceUSD
 */
export function parsePrice(item: any): {
  originalPrice: number;
  currency: string;
  priceUsd: number;
} {
  const itemId = item?.itemId?.[0];

  // Extract price string
  const priceStr = item?.sellingStatus?.[0]?.currentPrice?.[0]?.__value__;
  if (!priceStr) {
    console.error(`[Currency] Missing price for item ${itemId}. Returning 0.`);
    return {
      originalPrice: 0,
      currency: 'USD',
      priceUsd: 0,
    };
  }

  // Parse price
  const originalPrice = parseFloat(priceStr);
  if (isNaN(originalPrice)) {
    console.error(`[Currency] Invalid price "${priceStr}" for item ${itemId}. Returning 0.`);
    return {
      originalPrice: 0,
      currency: 'USD',
      priceUsd: 0,
    };
  }

  // Extract and validate currency
  const currency = extractCurrency(item);

  // Convert to USD
  const priceUsd = convertToUSD(originalPrice, currency, itemId);

  return {
    originalPrice,
    currency,
    priceUsd,
  };
}

/**
 * Check if currency conversion is needed
 * 
 * @param currency - Currency code
 * @returns true if conversion to USD is needed
 */
export function needsConversion(currency: string): boolean {
  return validateCurrency(currency) !== 'USD';
}
