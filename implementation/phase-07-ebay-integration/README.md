# Phase 07: eBay Integration & CT Price Pipeline

## 🎯 Overview
Phase 07 replaces placeholder market data with real eBay transactions and the CT Price algorithm. We ingest sold listings, cleanse them (outlier removal + recency weighting), populate `transactions` and `price_history`, and expose refreshed prices to the rest of the app. Auth is still deferred, so ingestion runs via server-side cron + internal service keys only.

## ✅ Goals
- Acquire and securely store eBay API credentials (sandbox first, prod later)
- Build ingestion workers that hydrate `transactions` + `price_history` while respecting rate limits
- Implement CT Price calculation (weighted average + grade multipliers) with confidence scoring
- Schedule cron/Taskfile jobs that update prices at least daily and provide logs/alerts

## 🔗 Prerequisites
- Phases 01-04 complete (schema + UI consumers ready)
- Supabase service role credentials stored securely in Taskfile/GitHub Actions secrets
- `planning/price-algorithm.md` reviewed end-to-end

## 📦 Deliverables
- [ ] eBay API client with Bottleneck rate limiting + retry logic
- [ ] CT Price algorithm module + unit tests
- [ ] Data pipeline (fetch → transform → store) populating `transactions` and `price_history`
- [ ] Scheduled cron (Taskfile + GitHub Action) with monitoring hooks (Sentry/logs)
- [ ] Documentation describing fallback strategy when eBay API unavailable

## 🧪 Testing Strategy
- Unit tests for price calculation, outlier detection, recency weighting
- Integration tests hitting eBay sandbox, recording fixtures to avoid quota exhaustion
- Manual dry runs on <10 cards validating DB writes + CT Price accuracy (±10%)

## ⚠️ Known Limitations
- Initial launch limited to Japanese listings; English/other marketplaces follow later
- Cron job uses GitHub Actions + Supabase REST; migrating to dedicated worker after Phase 10
- No public UI toggle for CT Price confidence yet (exposed in docs + detail page only)

## 📚 References
- `planning/price-algorithm.md`
- `planning/backend-architecture.md`
- `planning/database-architecture.md`
- `planning/feature-breakdown.md`
