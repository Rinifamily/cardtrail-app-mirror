# @cardtrail/db

Database query helpers and type-safe query builders for CardTrail.

## Features

- ✅ **Type-safe query builders** - Auto-generated types from Supabase schema
- ✅ **Enforced limits** - All queries include `.limit()` to prevent runaway queries
- ✅ **Consistent API** - Uniform interface across all table queries
- ✅ **Well-tested** - Comprehensive test coverage
- ✅ **Zero runtime dependencies** - Pure TypeScript query builders

## Installation

This package is part of the CardTrail monorepo. Use it in other workspace packages:

```json
{
  "dependencies": {
    "@cardtrail/db": "workspace:*"
  }
}
```

## Usage

### Price History Queries

```typescript
import { createClient } from '@supabase/supabase-js';
import { buildPriceHistoryQuery, PRICE_HISTORY_DEFAULTS } from '@cardtrail/db';

const supabase = createClient(/* ... */);

// Get 90 days of price history for a card
const query = buildPriceHistoryQuery({ 
  card_id: 12, 
  days: PRICE_HISTORY_DEFAULTS.DEFAULT_DAYS 
});

const { data } = await supabase
  .from('price_history')
  .select(query.select)
  .eq('card_id', query.card_id)
  .order('date', { ascending: false })
  .limit(query.limit);
```

### Market Indices Queries

```typescript
import { buildMarketIndexQuery, MARKET_INDEX_TYPES } from '@cardtrail/db';

// Get CTI history for last 30 days
const query = buildMarketIndexQuery({ 
  index_type: MARKET_INDEX_TYPES.CTI,
  days: 30
});

const { data } = await supabase
  .from('market_indices')
  .select(query.select)
  .eq('index_type', query.index_type)
  .order('date', { ascending: false })
  .limit(query.limit);
```

### Transaction Queries

```typescript
import { buildCTPriceQuery, GRADE_TYPES } from '@cardtrail/db';

// Get transactions for CT Price algorithm
const query = buildCTPriceQuery(12, GRADE_TYPES.PSA10, 90);

const { data } = await supabase
  .from('transactions')
  .select(query.select)
  .eq('card_id', query.card_id)
  .eq('grade', query.grade)
  .eq('is_outlier', false)
  .gte('sold_date', query.since_date)
  .order('sold_date', { ascending: false })
  .limit(query.limit);
```

## API Reference

### Price History

#### `buildPriceHistoryQuery(params)`

Build query for fetching price history.

**Parameters:**
- `card_id: number` - Card ID to fetch prices for
- `days?: number` - Number of days (default: 90)
- `data_source?: string` - Data source (default: 'ebay')

**Returns:** Query configuration object

#### `buildLatestPriceQuery(card_id)`

Build query for latest price of a card.

**Parameters:**
- `card_id: number` - Card ID

**Returns:** Query configuration object

#### `buildMultiCardPriceQuery(card_ids, days?)`

Build query for multiple cards.

**Parameters:**
- `card_ids: number[]` - Array of card IDs
- `days?: number` - Number of days (default: 30)

**Returns:** Query configuration object

### Market Indices

#### `buildMarketIndexQuery(params)`

Build query for market index history.

**Parameters:**
- `index_type: string` - Index type ('cti', 'cti_vintage', 'cti_modern')
- `days?: number` - Number of days (default: 30)

**Returns:** Query configuration object

#### `buildLatestIndexQuery(index_type)`

Build query for latest index value.

**Parameters:**
- `index_type: string` - Index type

**Returns:** Query configuration object

### Transactions

#### `buildTransactionsQuery(params)`

Build query for recent transactions.

**Parameters:**
- `card_id: number` - Card ID
- `limit?: number` - Maximum results (default: 50)
- `exclude_outliers?: boolean` - Exclude outliers (default: true)
- `grade?: string` - Filter by grade

**Returns:** Query configuration object

#### `buildCTPriceQuery(card_id, grade, days?)`

Build query for CT Price algorithm.

**Parameters:**
- `card_id: number` - Card ID
- `grade: string` - Grade type ('psa10', 'psa9', 'raw', etc.)
- `days?: number` - Lookback period (default: 90)

**Returns:** Query configuration object

## Constants

### Price History

```typescript
PRICE_HISTORY_DEFAULTS = {
  DEFAULT_DAYS: 90,
  MAX_DAYS: 365,
  CHART_DAYS: 30,
  DATA_SOURCE: 'ebay',
}
```

### Market Indices

```typescript
MARKET_INDEX_TYPES = {
  CTI: 'cti',
  CTI_VINTAGE: 'cti_vintage',
  CTI_MODERN: 'cti_modern',
}

MARKET_INDEX_DEFAULTS = {
  DEFAULT_DAYS: 30,
  CHART_DAYS: 90,
  MAX_DAYS: 365,
}
```

### Transactions

```typescript
TRANSACTION_DEFAULTS = {
  DEFAULT_LIMIT: 50,
  CT_PRICE_DAYS: 90,
  CT_PRICE_MAX_TRANSACTIONS: 100,
  RECENT_SALES_LIMIT: 20,
}

GRADE_TYPES = {
  PSA10: 'psa10',
  PSA9: 'psa9',
  PSA8: 'psa8',
  BGS10: 'bgs10',
  BGS9_5: 'bgs9.5',
  CGC10: 'cgc10',
  RAW: 'raw',
}

SUPPORTED_CURRENCIES = ['USD', 'CNY', 'JPY', 'EUR', 'GBP']
```

## Type Safety

All query builders use TypeScript types generated from the Supabase schema:

```typescript
import type { Database } from '@cardtrail/db';

type PriceHistoryRow = Database['public']['Tables']['price_history']['Row'];
type MarketIndexRow = Database['public']['Tables']['market_indices']['Row'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'];
```

## Development

### Run Tests

```bash
pnpm --filter @cardtrail/db test
```

### Watch Mode

```bash
pnpm --filter @cardtrail/db test:watch
```

### Type Check

```bash
pnpm --filter @cardtrail/db typecheck
```

## Related Packages

- `@cardtrail/shared-types` - Shared TypeScript types
- `@cardtrail/config` - Shared configuration

## Contributing

This package follows the CardTrail coding standards:

- ✅ Always use TypeScript strict mode
- ✅ Enforce `.limit()` on all queries
- ✅ No `any` types
- ✅ Comprehensive test coverage
- ✅ DRY and KISS principles

See `planning/agents.md` for full guidelines.

## License

Part of CardTrail project - see root LICENSE file.
