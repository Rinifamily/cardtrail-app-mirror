# CT Price Algorithm

CardTrail's proprietary price calculation algorithm that transforms raw eBay transaction data into reliable, weighted market prices.

## 🎯 Overview

CT Price is a **weighted average** of recent eBay transaction data with:
- **Statistical outlier removal** (IQR method)
- **Recency weighting** (exponential decay, 30-day half-life)
- **Volume weighting** (prefer single-card sales)
- **Quality weighting** (verified sales > active listings)
- **Confidence level determination** (high/medium/low)

## 🚀 Quick Start

```typescript
import { calculateCTPrice } from '@/lib/price-algorithm';

// Calculate PSA 10 price for a card
const result = await calculateCTPrice({
  card_id: 123,
  grade: 'psa10',
  language: 'jp',
});

console.log(`Price: ¥${result.price}`);
console.log(`Confidence: ${result.confidence}`);
console.log(`Sample size: ${result.sample_size}`);
```

**Output:**
```
Price: ¥150.25
Confidence: high
Sample size: 23
```

## 📊 Algorithm Steps

### 1. Collect Transaction Data
Query `transactions` table for card + grade within lookback window (default: 90 days).

### 2. Remove Outliers (IQR Method)
Use Interquartile Range to identify and remove statistical outliers:
- Q1 = 25th percentile
- Q3 = 75th percentile
- IQR = Q3 - Q1
- Bounds: [Q1 - 1.5×IQR, Q3 + 1.5×IQR]
- Remove transactions outside bounds

**Example:**
```
Input:  [50, 55, 60, 65, 70, 75, 80, 500]
Q1: 57.5, Q3: 77.5, IQR: 20
Bounds: [27.5, 107.5]
Outlier removed: 500
Output: [50, 55, 60, 65, 70, 75, 80]
```

### 3. Calculate Weights
Each transaction gets a combined weight:

**Recency Weight** (exponential decay):
```
recency_weight = e^(-days_ago / 30)
```
- Today: 1.00
- 30 days: 0.37
- 60 days: 0.14
- 90 days: 0.05

**Volume Weight**:
```
volume_weight = min(quantity, 1)
```
- Single card: 1.0
- Bulk (>1): <1.0

**Quality Weight**:
```
quality_weight = source_quality × listing_quality

source_quality:
  - Verified sale: 1.0
  - Active listing: 0.3

listing_quality:
  - Has grading info: 1.0
  - Missing grading: 0.7
```

**Combined Weight**:
```
weight = recency_weight × volume_weight × quality_weight
```

### 4. Calculate Weighted Average
```
CT_Price = Σ(price × weight) / Σ(weight)
```

### 5. Determine Confidence Level

| Level | Criteria | Display |
|-------|----------|---------|
| **High** | ≥10 samples, ≥5 weighted sum, ≤30 days | ⭐⭐⭐ |
| **Medium** | ≥5 samples, ≥2 weighted sum, ≤60 days | ⭐⭐ |
| **Low** | <5 samples or >60 days | ⭐ |

## 🎨 Usage Examples

### Calculate Price for Specific Grade
```typescript
import { calculateCTPrice } from '@/lib/price-algorithm';

const result = await calculateCTPrice({
  card_id: 123,
  grade: 'psa10',
});

if (result.price !== null) {
  console.log(`CT Price: $${result.price}`);
} else {
  console.log(`No data: ${result.message}`);
}
```

### Calculate with Fallback (Estimated Prices)
```typescript
import { calculatePriceWithFallback } from '@/lib/price-algorithm';

// If PSA 7 has no data, estimate from PSA 10/9/8
const result = await calculatePriceWithFallback(123, 'psa7');

if (result.is_estimated) {
  console.log(`Estimated from ${result.estimated_from}`);
}
```

### Calculate All Grades
```typescript
import { calculateAllGrades } from '@/lib/price-algorithm';

const prices = await calculateAllGrades(123);

console.log(`Raw: $${prices.raw.price}`);
console.log(`PSA 8: $${prices.psa8.price}`);
console.log(`PSA 9: $${prices.psa9.price}`);
console.log(`PSA 10: $${prices.psa10.price}`);
```

### Use Caching
```typescript
import { getCachedPrice, cachePrice } from '@/lib/price-algorithm';

// Check cache first
const cached = await getCachedPrice(123, 'psa10', 'jp');

if (cached) {
  return cached; // Fast path
}

// Calculate and cache
const result = await calculateCTPrice({ card_id: 123, grade: 'psa10' });
await cachePrice(123, 'psa10', 'jp', result);
```

### Store Price History
```typescript
import { calculateCTPrice, storePriceHistory } from '@/lib/price-algorithm';

const result = await calculateCTPrice({ card_id: 123, grade: 'psa10' });

// Save to price_history table for charts
await storePriceHistory(123, 'psa10', result);
```

## 🔍 Edge Cases

### No Data
Returns `null` price with message:
```typescript
{
  price: null,
  confidence: 'low',
  sample_size: 0,
  message: 'No recent sales data available for this card'
}
```

### Sparse Data (<5 transactions)
- Expands lookback window to 180 days
- Marks as low confidence
- Still calculates price if any data exists

### High Volatility (σ > 30% of mean)
- Uses **median** instead of weighted average
- Sets `volatility_warning: true`
- Message: "Price is highly volatile. Use caution."

### Language Filtering
```typescript
// Calculate for Japanese cards only
const result = await calculateCTPrice({
  card_id: 123,
  grade: 'psa10',
  language: 'jp'
});
```
Falls back to all languages if <5 Japanese transactions.

## 📈 Grading Adjustments

When a grade has insufficient data, estimate from other grades using multipliers:

```typescript
const GRADE_MULTIPLIERS = {
  'psa10': 1.00,    // Baseline
  'psa9':  0.60,    // 60% of PSA 10
  'psa8':  0.40,    // 40% of PSA 10
  'psa7':  0.25,
  'bgs10': 1.20,    // BGS 10 Black Label premium
  'bgs9_5': 0.90,
  'bgs9':  0.58,
  'cgc10': 0.95,
  'cgc9_5': 0.85,
  'raw':   0.30     // 30% of PSA 10 (ungraded)
};
```

**Example:**
- PSA 10 price: $100
- Estimated PSA 9: $100 × 0.60 = $60
- Estimated Raw: $100 × 0.30 = $30

## 🗄️ Caching Strategy

### Cache Layers
```
User Request
    ↓
[Browser Cache] (1 hour)
    ↓
[Vercel Edge Cache] (1 hour)
    ↓
[Redis Cache] (24 hours) ← CT Price algorithm caches here
    ↓
[Database] (permanent)
    ↓
[eBay API] (on-demand)
```

### Cache Keys
```
ct_price:{card_id}:{grade}:{language}
```

### Cache TTL
- **Redis**: 24 hours
- **Edge**: 1 hour (via HTTP headers)
- **Browser**: 1 hour (via HTTP headers)

### Invalidation
```typescript
import { invalidatePriceCache } from '@/lib/price-algorithm';

// Clear all cached prices for a card
await invalidatePriceCache(123);
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
pnpm test lib/price-algorithm

# Watch mode
pnpm test:watch lib/price-algorithm

# Coverage
pnpm test:coverage lib/price-algorithm
```

### Test Structure
```
__tests__/
  ├── utils.test.ts              # Utility functions
  ├── outlier-removal.test.ts    # IQR method
  ├── weight-calculation.test.ts # Recency/volume/quality weights
  ├── confidence-determination.test.ts
  ├── grading-adjustments.test.ts
  └── integration.test.ts        # End-to-end tests
```

## 🚦 API Endpoint

### GET `/api/v1/cards/[id]/price`

**Query Parameters:**
- `grade` (required): `psa10`, `psa9`, `raw`, etc.
- `language` (optional): `jp`, `en`, `cn`
- `force_refresh` (optional): Bypass cache
- `store_history` (optional): Save to price_history table

**Example:**
```bash
GET /api/v1/cards/123/price?grade=psa10&language=jp
```

**Response:**
```json
{
  "data": {
    "price": 150.25,
    "confidence": "high",
    "sample_size": 23,
    "weighted_sample_size": 15.67,
    "last_sale_date": "2024-12-08T10:30:00Z",
    "price_range": {
      "min": 140.00,
      "max": 165.00
    },
    "calculation_date": "2024-12-08T15:45:00Z",
    "outliers_removed": 2,
    "is_estimated": false
  },
  "cached": false,
  "calculation_time_ms": 145
}
```

### POST `/api/v1/cards/[id]/price`

Calculate multiple grades at once:

**Request Body:**
```json
{
  "grades": ["raw", "psa9", "psa10"],
  "language": "jp",
  "force_refresh": true
}
```

**Response:**
```json
{
  "data": {
    "raw": { "price": 45.00, "confidence": "medium", ... },
    "psa9": { "price": 90.00, "confidence": "high", ... },
    "psa10": { "price": 150.00, "confidence": "high", ... }
  },
  "calculation_time_ms": 412
}
```

## 📊 Performance

### Benchmarks
- **With cache**: <100ms
- **Without cache**: <2s
- **Target accuracy**: ±10% of market value

### Optimization Tips
1. **Use caching**: Check cache before calculating
2. **Batch operations**: Use `calculateAllGrades()` for multiple grades
3. **Async operations**: Don't block UI while calculating
4. **Background jobs**: Pre-calculate prices for popular cards

## 🔧 Configuration

### Environment Variables
```env
# Redis (for caching)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### Tuning Parameters

**Lookback Window:**
```typescript
// Default: 90 days
const result = await calculateCTPrice({
  card_id: 123,
  grade: 'psa10',
  lookback_days: 180  // Expand to 180 days
});
```

**Outlier Sensitivity:**
Currently hardcoded to 1.5 × IQR (industry standard).

**Recency Decay:**
Currently 30-day half-life. Adjust in `weight-calculation.ts`:
```typescript
const recencyWeight = Math.exp(-daysAgo / 30); // Change 30 to adjust
```

## 📚 References

### Planning Documents
- `planning/price-algorithm.md` - Complete specification
- `planning/database-architecture.md` - Database schema

### External Resources
- [IQR Method](https://en.wikipedia.org/wiki/Interquartile_range) - Outlier detection
- [Exponential Decay](https://en.wikipedia.org/wiki/Exponential_decay) - Recency weighting
- [Weighted Average](https://en.wikipedia.org/wiki/Weighted_arithmetic_mean) - Price calculation

## 🐛 Debugging

### Enable Verbose Logging
Logs are automatically output to console with `[CT Price]` prefix.

### Common Issues

**"No recent sales data available"**
- Normal for rare cards
- Try expanding lookback window to 180 days

**"All transactions were outliers"**
- Indicates data quality issue
- Manually review transaction data

**"Price is highly volatile"**
- Algorithm uses median instead of mean
- Expected for newly released or hyped cards

**Cache not working**
- Verify Redis credentials
- Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN

### Inspect Transaction Data
```typescript
// Query raw transactions
const supabase = createClient();
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('card_id', 123)
  .order('sold_date', { ascending: false })
  .limit(20);

console.log(data);
```

## 🚀 Next Steps

After implementing the algorithm:

1. **Display on UI**: Show CT Price on card detail page
2. **Price Charts**: Use price_history for trend visualization
3. **Price Alerts**: Trigger alerts when price crosses thresholds
4. **Market Dashboard**: Calculate CTI using CT Prices
5. **Rankings**: Sort cards by price change %

## 📝 License

MIT

---

**Built for CardTrail (卡迹)** - Empowering Pokemon TCG collectors with data-driven insights.
