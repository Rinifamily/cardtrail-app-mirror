# Task 02: CT Price Algorithm Implementation

**Goal:** Complete CT Price calculation algorithm with outlier removal and weighting

**Time Estimate:** 10 hours

**Phase:** Phase 7

**Dependencies:** Task 01 (eBay API Integration)

---

## 📖 Context

**What this task delivers:**
- Complete CT Price calculation algorithm
- Outlier removal (IQR method)
- Recency weighting (exponential decay)
- Grading adjustments (PSA 10/9/8, Raw multipliers)
- Confidence level determination
- Edge case handling (no data, sparse data, volatility)
- Comprehensive unit tests
- Integration tests with real data
- Basic testing included
- Ready for price data pipeline

**Why this matters:**
The CT Price algorithm is CardTrail's core innovation. It must be accurate, reliable, and explainable. Users trust CT Price for investment decisions, so correctness is critical.

**Planning docs:**
- `planning/price-algorithm.md` - Complete algorithm specification (CRITICAL - read entire document)
- `planning/feature-breakdown.md` - CT Price implementation
- `planning/agents.md` - Development guidelines (MANDATORY)

---

## ✅ Requirements

**Functional Requirements:**
- [ ] Calculate weighted average from transaction data
- [ ] Remove outliers using IQR method
- [ ] Apply recency weights (exponential decay, 30-day half-life)
- [ ] Apply grading adjustments (PSA 9 = 60% of PSA 10)
- [ ] Determine confidence level (high/medium/low)
- [ ] Handle edge cases (no data, sparse data, volatility)
- [ ] Return price with metadata (confidence, sample size, last sale date)

**Technical Requirements:**
- [ ] TypeScript strict mode
- [ ] Pure functions (no side effects)
- [ ] Comprehensive unit tests (>90% coverage)
- [ ] Performance: calculate in <100ms

**Acceptance Criteria:**
- [ ] Algorithm produces consistent results
- [ ] Outliers removed correctly
- [ ] Recency weights applied correctly
- [ ] Grading adjustments accurate
- [ ] Confidence levels correct
- [ ] Edge cases handled
- [ ] Unit tests pass (>20 tests)
- [ ] Accuracy within ±10% of market
- [ ] Deployed

---

## 📝 Implementation Approach

**lib/price-algorithm/calculate-ct-price.ts:**
```typescript
interface CTPriceParams {
  card_id: number;
  grade: 'raw' | 'psa8' | 'psa9' | 'psa10';
  lookback_days?: number;
}

interface CTPriceResult {
  price: number | null;
  confidence: 'high' | 'medium' | 'low';
  sample_size: number;
  last_sale_date: Date | null;
  price_range: { min: number; max: number } | null;
}

export async function calculateCTPrice(params: CTPriceParams): Promise<CTPriceResult> {
  // 1. Collect transaction data
  const transactions = await collectTransactionData(params);
  
  if (transactions.length === 0) {
    return { price: null, confidence: 'low', sample_size: 0, last_sale_date: null, price_range: null };
  }
  
  // 2. Remove outliers
  const filtered = removeOutliers(transactions);
  
  // 3. Apply weights
  const weighted = calculateWeights(filtered);
  
  // 4. Calculate weighted average
  const result = calculateWeightedAverage(weighted);
  
  return result;
}

function removeOutliers(transactions: Transaction[]): Transaction[] {
  if (transactions.length < 4) return transactions;
  
  const prices = transactions.map(t => t.price).sort((a, b) => a - b);
  const q1 = percentile(prices, 25);
  const q3 = percentile(prices, 75);
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return transactions.filter(t => t.price >= lowerBound && t.price <= upperBound);
}

function calculateWeights(transactions: Transaction[]): Array<Transaction & { weight: number }> {
  const now = new Date();
  
  return transactions.map(t => {
    const daysAgo = daysBetween(t.sold_date, now);
    const recencyWeight = Math.exp(-daysAgo / 30);
    const volumeWeight = Math.min(t.quantity, 1);
    const weight = recencyWeight * volumeWeight;
    
    return { ...t, weight };
  });
}
```

**Unit tests:**
```typescript
// __tests__/unit/lib/price-algorithm.test.ts
import { describe, it, expect } from 'vitest';
import { calculateCTPrice, removeOutliers } from '@/lib/price-algorithm';

describe('CT Price Algorithm', () => {
  it('should calculate weighted average correctly', async () => {
    const result = await calculateCTPrice({
      card_id: 1,
      grade: 'psa10',
      transactions: [
        { price: 100, sold_date: new Date(), weight: 1.0 },
        { price: 110, sold_date: new Date(), weight: 0.9 },
      ],
    });
    
    expect(result.price).toBeCloseTo(104.74, 1);
  });
  
  it('should remove outliers', () => {
    const transactions = [
      { price: 50 },
      { price: 55 },
      { price: 60 },
      { price: 500 }, // Outlier
    ];
    
    const filtered = removeOutliers(transactions);
    expect(filtered).toHaveLength(3);
  });
});
```

---

## ✅ Done When

- [ ] Algorithm works
- [ ] Tests pass
- [ ] Accuracy validated
- [ ] Deployed

---

**Built with:** Agent Cube - Efficiency Mode  
**For:** CardTrail (卡迹) PTCG Price Tracker  
**Agent Guidelines:** `planning/agents.md`
