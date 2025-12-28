# Internal Services

This directory contains internal services and utilities for CardTrail's backend operations.

---

## 📦 Price Sync Pipeline

The automated price synchronization system that keeps card prices up-to-date.

### Purpose

The price sync pipeline runs daily at 00:00 UTC via Vercel Cron to:
- Calculate CT Prices for all tracked cards
- Update `card_extensions` table with current prices
- Store historical price data in `price_history`
- Handle errors gracefully without stopping batch processing
- Monitor execution and alert on high failure rates

### Architecture

```
Vercel Cron (00:00 UTC)
    ↓
POST /api/internal/sync-prices
    ↓
syncPrices() → getCardsForPriceUpdate()
    ↓
syncPricesInBatches() → processSingleCard()
    ↓
calculateCTPrice() (with retry logic)
    ↓
Update card_extensions + price_history
```

### Files

- **`sync-prices.ts`** - Core sync logic with batch processing
- **`email-notifier.ts`** - Email notification service
- **`/app/api/internal/sync-prices/route.ts`** - API endpoint handler

---

## 🔐 Environment Variables

### Required

```bash
# Internal API Key
# Protects internal API endpoints from unauthorized access
# Generate with: openssl rand -base64 32
INTERNAL_API_KEY=your_secure_random_string_here
```

### Optional

```bash
# Email Notifications
ENABLE_PRICE_SYNC_EMAIL=false
ADMIN_EMAIL=admin@cardtrail.app
RESEND_API_KEY=re_xxxxx

# Monitoring
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## 🚀 Manual Execution

### Local Testing (Dry Run)

```bash
curl -X POST http://localhost:3000/api/internal/sync-prices?dryRun=true \
  -H "x-internal-api-key: dev_secret_key_change_in_production"
```

### Test with Small Batch

```bash
curl -X POST http://localhost:3000/api/internal/sync-prices?limit=5 \
  -H "x-internal-api-key: dev_secret_key_change_in_production"
```

### Production (Full Sync)

```bash
curl -X POST https://your-app.vercel.app/api/internal/sync-prices \
  -H "x-internal-api-key: your_production_key"
```

### Query Parameters

- **`limit`** (default: 1000) - Max cards to process
- **`offset`** (default: 0) - Pagination offset
- **`dryRun`** (default: false) - Simulate without writing data

---

## 📊 Response Format

### Success

```json
{
  "status": "completed",
  "summary": {
    "totalCards": 1000,
    "processed": 1000,
    "successful": 980,
    "failed": 20,
    "skipped": 0,
    "duration": "245s",
    "totalDuration": "250s",
    "errors": [
      { "cardId": 123, "error": "No data available" }
    ]
  }
}
```

### Error

```json
{
  "status": "failed",
  "error": "Database connection failed",
  "summary": { ... }
}
```

---

## ⚙️ Configuration

### Batch Processing

- **Batch Size:** 100 cards per batch
- **Rate Limiting:** 1 second delay between batches
- **Retry Logic:** 3 attempts with exponential backoff
- **Timeout:** 5 minutes (Vercel Pro), 10 seconds (Hobby)

### Retry Strategy

Automatic retry for transient errors:
- Network timeouts (ETIMEDOUT, ECONNRESET)
- Rate limits (HTTP 429)
- Server errors (HTTP 500-504)

Exponential backoff: 1s → 2s → 4s (max 10s)

### Card Selection

Cards are selected for update when:
- `price_updated_at` is NULL (never updated)
- `price_updated_at` > 24 hours ago (stale)

Priority: Most recently viewed cards first (`last_viewed_at DESC`)

---

## 🔍 Monitoring

### Logs

All operations are logged with structured prefixes:

```
[syncPrices] Starting price sync { limit, offset, dryRun }
[getCardsForPriceUpdate] Found X cards needing updates
[syncPricesInBatches] Processing batch 1/10 (100 cards)
[processSingleCard] Processing card 123: Card Name
[processSingleCard] ✓ Card 123 updated: $100.00 (confidence: high)
[processSingleCard] ✗ Error for card 456: No data available
[syncPricesInBatches] Completed: 95 success, 5 failed, 45s
[sync-prices] ✓ Completed in 50s
```

### Failure Rate Monitoring

A warning is logged if failure rate exceeds 20%:

```
[sync-prices] ⚠️ High failure rate: 25.5%
```

### Email Notifications

If enabled (`ENABLE_PRICE_SYNC_EMAIL=true`), a summary email is sent after each sync:

```
CardTrail Price Sync Summary
============================

Timestamp: 2025-12-08T00:05:23.456Z
Duration: 245s

Results:
  Total Cards: 1000
  Processed: 1000
  Successful: 980 ✓
  Failed: 20 ✗
  Failure Rate: 2.0%

Errors (showing first 10):
  - Card 123: No recent sales data
  - Card 456: eBay API timeout
```

---

## 🐛 Troubleshooting

### Common Issues

#### 401 Unauthorized

**Cause:** Missing or invalid `INTERNAL_API_KEY`

**Fix:**
1. Verify environment variable is set in Vercel
2. Check header uses lowercase: `x-internal-api-key`
3. Ensure key matches exactly (no trailing spaces)

#### 500 API Key Not Configured

**Cause:** `INTERNAL_API_KEY` not set in environment

**Fix:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add `INTERNAL_API_KEY` with secure random string
3. Redeploy application

#### High Failure Rate

**Cause:** eBay API issues, database connection problems, or bad data

**Fix:**
1. Check Vercel logs for specific error patterns
2. Verify database connection (run health check)
3. Check eBay API status
4. Run dry-run to test without writes
5. Reduce batch size if hitting rate limits

#### Timeout Errors

**Cause:** Processing too many cards or slow API responses

**Fix:**
1. Reduce `limit` parameter (try 500 instead of 1000)
2. Check if on Vercel Hobby plan (10s limit)
3. Upgrade to Vercel Pro for 5-minute limit
4. Monitor batch processing duration in logs

#### Cards Not Updating

**Cause:** Selection criteria not matching expected cards

**Fix:**
1. Check `card_extensions.price_updated_at` timestamps
2. Verify cards exist in database
3. Run dry-run to see which cards would be selected
4. Check query logic in `getCardsForPriceUpdate()`

---

## 🧪 Testing

### Unit Tests

```bash
# Run sync-prices tests
pnpm test apps/web/__tests__/lib/internal/sync-prices.test.ts

# Run API route tests
pnpm test apps/web/__tests__/app/api/internal/sync-prices.test.ts
```

### Integration Test

```bash
# Requires database credentials
pnpm test apps/web/__tests__/lib/internal/sync-prices.integration.test.ts
```

### Manual Testing Checklist

- [ ] Dry run executes without errors
- [ ] Small batch (5 cards) completes successfully
- [ ] Database updates verified in Supabase
- [ ] Duplicate price_history entries handled
- [ ] Authentication rejects invalid API keys
- [ ] Logs show structured output
- [ ] Email notification sent (if enabled)

---

## 📈 Performance

### Benchmarks

- **100 cards:** ~60 seconds
- **1000 cards:** ~5-6 minutes
- **Batch processing:** ~0.5-1 second per card (including rate limiting)

### Optimization Tips

1. **Increase batch size** (if not hitting rate limits)
2. **Reduce delay** between batches (careful with API limits)
3. **Run multiple times per day** with smaller limits
4. **Priority queuing** for high-traffic cards (future enhancement)

---

## 🔮 Future Enhancements

- [ ] Advanced retry logic with circuit breaker
- [ ] Redis caching for distributed coordination
- [ ] Real-time WebSocket updates for live prices
- [ ] Priority queuing based on card popularity
- [ ] Multi-region sync for faster global updates
- [ ] A/B testing different price algorithms
- [ ] Automated anomaly detection
- [ ] Slack/Discord notifications
- [ ] Grafana dashboard for metrics

---

## 📚 Related Documentation

- [Backend Architecture](../../../planning/backend-architecture.md)
- [API Design](../../../planning/api-design.md)
- [Performance Monitoring](../../../planning/performance-monitoring.md)
- [eBay Integration](../ebay/README.md)
- [Price Algorithm](../price-algorithm/README.md)

---

## 📞 Support

**Issues:** Check Vercel logs and Supabase dashboard  
**Questions:** Review planning docs and test files  
**Monitoring:** Enable Sentry for error tracking

---

*Last Updated: December 8, 2025*
