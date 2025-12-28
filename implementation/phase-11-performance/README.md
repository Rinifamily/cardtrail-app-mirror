# Phase 11: Performance & Monitoring

## 🎯 Overview
With auth + cloud sync complete, Phase 11 focuses on shipping a production-grade experience: slim bundles, optimized database queries, caching layers, and full telemetry (Sentry, Vercel Analytics, Uptime). Targets follow `planning/performance-monitoring.md` (mobile-first budgets).

## ✅ Goals
- Hit Core Web Vitals targets (LCP < 2.5s, CLS < 0.1, FID/INP within green thresholds)
- Keep First Load JS < 150 KB (gzipped) and per-route JS < 50 KB
- Optimize Supabase queries (indexes, caching) so p95 latency < 100 ms
- Stand up monitoring + alerting for frontend, backend, and database layers

## 🔗 Prerequisites
- Phase 10 WeChat login complete (all entry points ready)
- All user data persisted to Supabase (Phase 09)
- Access to Vercel production project, Sentry org, Uptime monitor

## 📦 Deliverables
- [ ] Bundle analysis + optimizations (code splitting, dynamic imports, image/CDN tuning)
- [ ] Database/query tuning checklist with new indexes/materialized views where allowed
- [ ] Edge caching + HTTP headers (cache-control, security headers) defined
- [ ] Monitoring stack: Sentry, Vercel Analytics, UptimeRobot, Supabase metrics dashboard
- [ ] Runbooks + dashboards documented for on-call

## 🧪 Testing Strategy
- Lighthouse CI on PRs (mobile + desktop)
- WebPageTest runs from CN & SG regions
- Load tests for critical APIs (search, rankings, migration) verifying budgets
- Synthetic uptime checks every 1 minute with alert escalation

## ⚠️ Known Limitations
- Some heavy dependencies (Recharts) stay until we adopt lighter charts; mitigate via route-level code splitting
- Database materialized views require coordination with data team when touching `card_jp`

## 📚 References
- `planning/performance-monitoring.md`
- `planning/deployment-operations.md`
- `planning/security-privacy.md`
- `planning/testing-strategy.md`
