/**
 * Real-time Exchange Rate Service
 * 
 * Integrates with exchangerate-api.com for live currency conversion.
 * Caches rates to minimize API calls and improve performance.
 */

/**
 * Supported currencies
 * Extended to include CNY (Chinese Yuan) as primary display currency
 */
export const SUPPORTED_CURRENCIES = [
  'CNY', // Chinese Yuan (Primary display currency)
  'USD', // United States Dollar
  'JPY', // Japanese Yen
  'EUR', // Euro
  'GBP', // British Pound
  'AUD', // Australian Dollar
  'CAD', // Canadian Dollar
  'CHF', // Swiss Franc
  'HKD', // Hong Kong Dollar
  'SGD', // Singapore Dollar
  'NZD', // New Zealand Dollar
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Exchange rate cache
 * Stores rates with CNY as base currency
 */
interface ExchangeRateCache {
  rates: Record<string, number>;
  lastUpdated: number;
  baseCurrency: 'CNY';
}

let rateCache: ExchangeRateCache | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fallback static rates (CNY as base)
 * Used when API is unavailable
 * Last updated: 2024-12-08
 */
const FALLBACK_RATES_CNY_BASE: Record<string, number> = {
  'CNY': 1.0,
  'USD': 0.138,  // 1 CNY ≈ 0.138 USD (≈7.25 CNY/USD)
  'JPY': 20.6,   // 1 CNY ≈ 20.6 JPY
  'EUR': 0.127,  // 1 CNY ≈ 0.127 EUR
  'GBP': 0.109,  // 1 CNY ≈ 0.109 GBP
  'AUD': 0.214,  // 1 CNY ≈ 0.214 AUD
  'CAD': 0.193,  // 1 CNY ≈ 0.193 CAD
  'CHF': 0.122,  // 1 CNY ≈ 0.122 CHF
  'HKD': 1.075,  // 1 CNY ≈ 1.075 HKD
  'SGD': 0.185,  // 1 CNY ≈ 0.185 SGD
  'NZD': 0.233,  // 1 CNY ≈ 0.233 NZD
};

/**
 * Fetch live exchange rates from API
 * 
 * Free tier: 1,500 requests/month
 * @see https://www.exchangerate-api.com/
 */
async function fetchLiveRates(): Promise<Record<string, number>> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  
  if (!apiKey) {
    console.warn('[ExchangeRate] No API key found, using fallback rates');
    return FALLBACK_RATES_CNY_BASE;
  }

  try {
    // Fetch rates with CNY as base
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/CNY`,
      {
        next: { revalidate: 86400 } // Cache for 24 hours
      }
    );

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== 'success') {
      throw new Error(`API error: ${data['error-type']}`);
    }

    console.log('[ExchangeRate] Successfully fetched live rates (CNY base)');
    return {
      'CNY': 1.0,
      ...data.conversion_rates
    };
  } catch (error) {
    console.error('[ExchangeRate] Failed to fetch live rates:', error);
    console.warn('[ExchangeRate] Falling back to static rates');
    return FALLBACK_RATES_CNY_BASE;
  }
}

/**
 * Get exchange rates with caching
 * 
 * Returns cached rates if available and fresh, otherwise fetches new rates.
 */
export async function getExchangeRates(): Promise<ExchangeRateCache> {
  const now = Date.now();

  // Return cached rates if still valid
  if (rateCache && (now - rateCache.lastUpdated) < CACHE_DURATION) {
    return rateCache;
  }

  // Fetch fresh rates
  const rates = await fetchLiveRates();
  
  rateCache = {
    rates,
    lastUpdated: now,
    baseCurrency: 'CNY'
  };

  return rateCache;
}

/**
 * Convert amount from one currency to CNY
 * 
 * @param amount - Amount in source currency
 * @param fromCurrency - Source currency code
 * @returns Amount in CNY
 * 
 * @example
 * ```typescript
 * // Convert $100 USD to CNY
 * await convertToCNY(100, 'USD');  // Returns ~725 CNY
 * 
 * // Convert ¥10000 JPY to CNY
 * await convertToCNY(10000, 'JPY'); // Returns ~485 CNY
 * ```
 */
export async function convertToCNY(
  amount: number,
  fromCurrency: string
): Promise<number> {
  // Validate amount
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0 || !isFinite(amount)) {
    console.error(`[Currency] Invalid amount: ${amount}`);
    return 0;
  }

  // Already CNY
  const normalized = fromCurrency.toUpperCase().trim();
  if (normalized === 'CNY') {
    return amount;
  }

  // Get exchange rates
  const { rates } = await getExchangeRates();

  // Check if currency is supported
  if (!rates[normalized]) {
    console.warn(
      `[Currency] Unknown currency: ${fromCurrency}. Supported: ${Object.keys(rates).join(', ')}`
    );
    // Assume 1:1 with CNY as fallback
    return amount;
  }

  // Convert: fromCurrency → CNY
  // If rates are CNY-based: 1 CNY = X fromCurrency
  // So: amount fromCurrency × (1/X) = amount in CNY
  const rate = rates[normalized];
  const cnyAmount = amount / rate;

  if (process.env.NODE_ENV === 'development') {
    console.debug(
      `[Currency] ${amount} ${normalized} → ${cnyAmount.toFixed(2)} CNY (rate: ${rate})`
    );
  }

  return cnyAmount;
}

/**
 * Format price for display
 * Shows CNY as primary with original currency in parentheses
 * 
 * @param cnyAmount - Amount in CNY
 * @param originalAmount - Original amount
 * @param originalCurrency - Original currency code
 * @returns Formatted string: "¥725.00 ($100.00)"
 * 
 * @example
 * ```typescript
 * formatPriceDisplay(725, 100, 'USD');  // "¥725.00 ($100.00)"
 * formatPriceDisplay(485, 10000, 'JPY'); // "¥485.00 (¥10,000)"
 * formatPriceDisplay(100, 100, 'CNY');  // "¥100.00"
 * ```
 */
export function formatPriceDisplay(
  cnyAmount: number,
  originalAmount: number,
  originalCurrency: string
): string {
  const normalized = originalCurrency.toUpperCase().trim();

  // Format CNY amount
  const cnyFormatted = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cnyAmount);

  // If already CNY, no need to show original
  if (normalized === 'CNY') {
    return cnyFormatted;
  }

  // Format original amount
  let originalFormatted: string;
  try {
    originalFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalized,
      minimumFractionDigits: getCurrencyDecimals(normalized),
      maximumFractionDigits: getCurrencyDecimals(normalized),
    }).format(originalAmount);
  } catch (error) {
    // Fallback for unsupported currencies
    originalFormatted = `${originalAmount.toFixed(2)} ${normalized}`;
  }

  return `${cnyFormatted} (${originalFormatted})`;
}

/**
 * Get appropriate decimal places for currency
 */
function getCurrencyDecimals(currency: string): number {
  // JPY typically doesn't use decimals
  if (currency === 'JPY') {
    return 0;
  }
  // Most currencies use 2 decimals
  return 2;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'CNY': '¥',
    'USD': '$',
    'JPY': '¥',
    'EUR': '€',
    'GBP': '£',
    'AUD': 'A$',
    'CAD': 'C$',
    'CHF': 'CHF',
    'HKD': 'HK$',
    'SGD': 'S$',
    'NZD': 'NZ$',
  };
  return symbols[currency.toUpperCase()] || currency;
}

/**
 * Check if exchange rates are from live API or fallback
 */
export async function isUsingLiveRates(): Promise<boolean> {
  const { lastUpdated } = await getExchangeRates();
  return !!process.env.EXCHANGE_RATE_API_KEY && lastUpdated > 0;
}

