# Currency Module

Real-time currency conversion system with CNY (Chinese Yuan) as primary display currency.

## Features

✅ **Real-time Exchange Rates** - Integrates with exchangerate-api.com  
✅ **CNY Primary Display** - Shows prices in ¥ (Chinese Yuan)  
✅ **Original Currency in Parentheses** - E.g., `¥725.00 ($100.00)`  
✅ **Automatic Caching** - 24-hour cache to minimize API calls  
✅ **Fallback Rates** - Static rates when API unavailable  
✅ **React Components** - Ready-to-use UI components

## Quick Start

### 1. Get API Key (Free)

Sign up at [exchangerate-api.com](https://www.exchangerate-api.com/):
- Free tier: 1,500 requests/month
- No credit card required
- Instant activation

### 2. Add to Environment

```bash
# .env.local
EXCHANGE_RATE_API_KEY=your_api_key_here
```

### 3. Use in Components

```tsx
import { PriceDisplay } from '@/components/ui/PriceDisplay';

// Display price with automatic conversion
<PriceDisplay amount={100} currency="USD" />
// Output: ¥725.00 ($100.00)

<PriceDisplay amount={10000} currency="JPY" />
// Output: ¥485.00 (¥10,000)

<PriceDisplay amount={500} currency="CNY" />
// Output: ¥500.00
```

## API Reference

### `convertToCNY(amount, currency)`

Convert any currency to CNY.

```typescript
import { convertToCNY } from '@/lib/currency';

// Convert $100 USD to CNY
const cnyAmount = await convertToCNY(100, 'USD');
// Returns: ~725 (depending on current rate)

// Convert ¥10000 JPY to CNY
const cnyAmount = await convertToCNY(10000, 'JPY');
// Returns: ~485
```

### `formatPriceDisplay(cnyAmount, originalAmount, originalCurrency)`

Format price for display.

```typescript
import { formatPriceDisplay } from '@/lib/currency';

const formatted = formatPriceDisplay(725, 100, 'USD');
// Returns: "¥725.00 ($100.00)"

const formatted = formatPriceDisplay(485, 10000, 'JPY');
// Returns: "¥485.00 (¥10,000)"

const formatted = formatPriceDisplay(100, 100, 'CNY');
// Returns: "¥100.00"
```

### `getExchangeRates()`

Get current exchange rates (cached for 24h).

```typescript
import { getExchangeRates } from '@/lib/currency';

const { rates, lastUpdated, baseCurrency } = await getExchangeRates();
console.log(rates);
// {
//   'CNY': 1.0,
//   'USD': 0.138,
//   'JPY': 20.6,
//   'EUR': 0.127,
//   ...
// }
```

## React Components

### `<PriceDisplay />`

Main component for displaying prices.

```tsx
<PriceDisplay 
  amount={100} 
  currency="USD"
  className="text-lg font-bold"
  showLoader={true}
/>
```

**Props:**
- `amount` (number) - Price amount
- `currency` (string) - Currency code (USD, JPY, EUR, etc.)
- `className` (string, optional) - CSS classes
- `showLoader` (boolean, optional) - Show skeleton while loading

### `<CNYPrice />`

Simple CNY display (no conversion needed).

```tsx
<CNYPrice amount={725} className="text-2xl" />
// Output: ¥725.00
```

### `<PriceChange />`

Show price change with color coding.

```tsx
<PriceChange
  currentAmount={110}
  previousAmount={100}
  currency="USD"
/>
// Output: +¥72.50 (+10.00%) in green
```

## Supported Currencies

| Code | Currency | Symbol |
|------|----------|--------|
| CNY | Chinese Yuan | ¥ |
| USD | US Dollar | $ |
| JPY | Japanese Yen | ¥ |
| EUR | Euro | € |
| GBP | British Pound | £ |
| AUD | Australian Dollar | A$ |
| CAD | Canadian Dollar | C$ |
| CHF | Swiss Franc | CHF |
| HKD | Hong Kong Dollar | HK$ |
| SGD | Singapore Dollar | S$ |
| NZD | New Zealand Dollar | NZ$ |

## Caching Strategy

- **Duration:** 24 hours
- **Storage:** In-memory cache
- **Refresh:** Automatic on first request after expiry
- **API Calls:** ~1 per day (well within free tier)

## Fallback Behavior

If API is unavailable:
1. Uses static rates (updated quarterly)
2. Logs warning to console
3. Continues to function normally

**Fallback rates accuracy:** ±5-10%

## Performance

- **First Load:** ~200-500ms (API call)
- **Cached:** <1ms (instant)
- **Component Render:** <10ms

## Migration from Old System

### Before (USD-based)

```typescript
// Old: Everything in USD
price_usd: number;
```

### After (CNY-based)

```typescript
// New: Store original + CNY
price_cny: number;
original_price: number;
original_currency: string;
```

### Update Database Schema

```sql
-- Add CNY columns to existing tables
ALTER TABLE transactions 
  ADD COLUMN price_cny DECIMAL(10, 2),
  ADD COLUMN original_price DECIMAL(10, 2),
  ADD COLUMN original_currency VARCHAR(3);

-- Migrate existing USD data
UPDATE transactions 
SET 
  price_cny = price_usd * 7.25,  -- Approximate USD to CNY
  original_price = price_usd,
  original_currency = 'USD'
WHERE price_cny IS NULL;
```

## Testing

```bash
# Run currency module tests
pnpm test lib/currency

# Test with mock API
EXCHANGE_RATE_API_KEY=test_key pnpm test
```

## Troubleshooting

### API Key Not Working

```bash
# Check if key is set
echo $EXCHANGE_RATE_API_KEY

# Test API directly
curl "https://v6.exchangerate-api.com/v6/YOUR_KEY/latest/CNY"
```

### Rates Not Updating

```typescript
// Force refresh cache
import { getExchangeRates } from '@/lib/currency';

// Clear cache (set lastUpdated to 0)
const rates = await getExchangeRates();
console.log('Last updated:', new Date(rates.lastUpdated));
```

### Wrong Conversion Results

Check fallback rates in `exchange-rates.ts`:

```typescript
const FALLBACK_RATES_CNY_BASE = {
  'CNY': 1.0,
  'USD': 0.138,  // 1 CNY ≈ 0.138 USD
  // Update if rates are stale
};
```

## Future Enhancements

- [ ] Support more currencies (KRW, THB, etc.)
- [ ] Historical rate tracking
- [ ] Rate change alerts
- [ ] Admin dashboard for rate monitoring
- [ ] Automatic rate update notifications

## Resources

- [Exchange Rate API Docs](https://www.exchangerate-api.com/docs)
- [Currency Code List (ISO 4217)](https://en.wikipedia.org/wiki/ISO_4217)
- [Intl.NumberFormat MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)

## License

Part of CardTrail (卡迹) - PTCG Price Tracker

