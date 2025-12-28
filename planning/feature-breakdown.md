# CardTrail Feature Breakdown & Restructured Phase Plan

**Document Version:** 2.0  
**Last Updated:** December 5, 2025  
**Status:** Golden Source – Auth Deferred Plan  
**Owner:** Product & Engineering Team

> 🔐 = Auth-required feature (Better Auth + Supabase user tables)

---

## Overview
- **Auth Deferred:** Core experience (search, market, local portfolio) ships without waiting for third-party credentials. Better Auth + cloud sync arrive in Phases 08-09.
- **Local-First Data:** Collections and watchlists persist via `localStorage`/IndexedDB (Phases 05-06) and migrate to Supabase during Phase 09.
- **Parallelization:** After Phase 02, market, rankings, local data, and eBay ingestion can progress in parallel.
- **Polish Later:** Performance + i18n reserved for Phases 11-12 after auth + migration stabilize.

### Phase Summary
| Phase | Name | Focus | Notes |
|-------|------|-------|-------|
| 00 | Scaffold | Monorepo, App Router, testing, bottom nav | ✅ Complete |
| 01 | Database Core | `price_history`, `market_indices`, `transactions` tables + RLS | Unblocks data consumers |
| 02 | Search & Card Display | Full-text search, filters, card detail + charts | MVP-ready | 
| 03 | Market Dashboard | CTI hero, K-line chart, gainers/losers, volume stats | Runs parallel w/ 04 |
| 04 | Rankings | Price change, volume, popularity leaderboards + sharing | Links to Phase 10 share features |
| 05 | Local Collection | Local portfolio CRUD, P&L, IndexedDB fallback | Clear warning: "local only until Phase 09" |
| 06 | Local Watchlist & Alerts | Local watchlist + price alerts, PWA prep | Shares schema with Phase 09 tables |
| 07 | eBay Integration | Live transaction ingestion, CT Price algorithm, cron jobs | Seeds Phase 01 tables |
| 08 | 🔐 Authentication | Better Auth, SMS providers, protected routes | Prereq for cloud sync |
| 09 | 🔐 Cloud Sync | Supabase collections/watchlists/price_alerts + migration wizard | Migrates local data |
| 10 | 🔐 WeChat Login & Social | WeChat OAuth + account linking + share hooks | Requires Phase 08-09 |
| 11 | Performance & Monitoring | Bundle/db/query optimization, Sentry, Uptime | Post-auth polish |
| 12 | Internationalization | zh-CN/en translations, locale routing, final QA | Launch polish |

### Dependencies
```
Phase 00 → Phase 01 → Phase 02 → Phase 03
                           ↘ Phase 04
                           ↘ Phase 05 → Phase 06 → Phase 08 🔐 → Phase 09 🔐 → Phase 10 🔐
                           ↘ Phase 07
Phase 08/09 feed Phase 11 → Phase 12
```

### Local → Cloud Migration Path
1. **Phases 05-06:** Store portfolio + watchlist locally (`cardtrail_*_v1` keys, IndexedDB fallback). Data mirrors future Supabase schema and stores `migrationStatus` fields.  
2. **Phase 08:** Users authenticate (Better Auth + SMS).  
3. **Phase 09:** Migration wizard validates local data, uploads to Supabase, verifies counts, clears local storage, and enables real-time sync.  
4. **Phase 10+:** WeChat login + sharing rely on cloud data and authenticated sessions.

---

## Phase Details

### Phase 01 – Database Core (No Auth)
- **Deliverables:** Migrations for `price_history`, `market_indices`, `transactions`; indexes; public read-only RLS policies; Supabase type generation and test plan.
- **Testing:** Supabase CLI migrations, RLS verification (anon role blocked from writes), unit tests for query helpers.
- **Impact:** Enables Phases 02-04 to consume legit data without auth.

### Phase 02 – Search & Card Display
- **Features:** Full-text search + filters, autocomplete, responsive card grid, card detail w/ price history chart + recent transactions, sticky local CTAs.
- **Testing:** Playwright flow (search → detail), Vitest for query builders, Lighthouse >90 mobile.
- **Parallelization:** Once complete, phases 03-07 can start.

### Phase 03 – Market Dashboard
- **Features:** CTI hero card, candlestick chart, sub-index carousel, gainers/losers list, volume stats, faux real-time indicator.
- **Data:** Uses Phase 01 tables + placeholder fixtures until Phase 07 ingestion.
- **Testing:** Snapshot tests for CTI hero, chart performance profiling.

### Phase 04 – Rankings
- **Features:** Tabs for price risers/fallers/volume/popularity, timeframe filters, comparison drawer, share CTA prepping for Phase 10.
- **Auth:** None required; share copy warns "cloud sync coming soon".

### Phase 05 – Local Collection (本地持仓)
- **Features:** Local CRUD UI, portfolio summary, export/import JSON, IndexedDB fallback, warnings about Phase 09 sync.
- **Deliverable:** `localCollectionStore` + UI + analytics referencing public price tables.
- **Risks:** Storage quotas – handle via fallback + messaging.

### Phase 06 – Local Watchlist & Alerts (本地关注)
- **Features:** Watchlist management, target price alerts, local evaluation engine on app load, PWA push prep, shared export/import.
- **Notes:** Shares schema + repository pattern with Phase 05 to simplify Phase 09 migration.

### Phase 07 – eBay Integration
- **Features:** eBay Finding API client, rate limiting, CT Price algorithm, cron job populating `transactions` + `price_history`.
- **Dependency:** Requires Phase 02 (card detail consumes new data). Sets stage for accurate dashboards/rankings.

### Phase 08 – 🔐 Authentication (Better Auth)
- **Features:** Better Auth setup, phone OTP (Aliyun/Tencent), auth UI, protected routes, `requireAuth` helper, secret handling runbooks.
- **Testing:** Playwright for auth flows, sandbox SMS verification, Sentry logging.

### Phase 09 – 🔐 Cloud Sync
- **Features:** Supabase tables (`collections`, `watchlists`, `price_alerts`), migration wizard, conflict resolution, rollback, audit logs.
- **UX:** Settings → Data Sync wizard with progress + JSON export option.

### Phase 10 – 🔐 WeChat Login & Social
- **Features:** WeChat OAuth login, account linking, WeChat JS SDK share hooks for card detail/rankings, fallback copy link.
- **Compliance:** Follow `planning/authentication-research.md` WeChat checklist + ICP requirements.

### Phase 11 – Performance & Monitoring
- **Features:** Bundle trimming, dynamic imports, query tuning, caching strategy (browser, edge, Redis), Sentry, Vercel Analytics, UptimeRobot, runbooks.
- **Targets:** LCP < 2.5s, CLS < 0.1, p95 API latency < 200 ms.

### Phase 12 – Internationalization & Launch Polish
- **Features:** `next-intl`, zh-CN/en translations, locale routing + switcher, locale-aware formatting, hreflang + sitemap, legal pages, launch checklist.
- **Testing:** Run entire E2E suite in both locales, manual QA on low-end Android.

---

## Testing & QA Highlights
- **Unit:** Price algorithm, storage repositories, migration helpers, auth utilities.
- **Integration:** Supabase migrations (Phase 01), Better Auth flows (Phase 08), migration pipeline (Phase 09).
- **E2E:** Search → detail → add to collection (local), watchlist alerts, migration wizard, WeChat login.
- **Performance:** Lighthouse CI (Phase 02 onward), WebPageTest CN/SG (Phase 11).

---

## Milestones & Releases
| Milestone | Includes | Target |
|-----------|----------|--------|
| MVP | Phases 00-02 | Ready now once Phase 02 done |
| Core App Beta | Phases 00-06 + placeholder data | After Phase 06 |
| Data Accuracy | Phase 07 live ingestion | After eBay creds |
| Auth Beta | 🔐 Phases 08-09 | After credentials provisioned |
| Social Launch | 🔐 Phase 10 + Phase 07 data | After WeChat approval |
| Production Polish | Phases 11-12 | Launch-ready |

---

## References
- `planning/local-storage.md`
- `planning/data-migration.md`
- `planning/data-models.md`
- `planning/database-architecture.md`
- `planning/authentication-research.md`
- `implementation/phase-*/` directories for detailed tasks
