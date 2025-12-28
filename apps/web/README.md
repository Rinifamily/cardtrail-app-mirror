# CardTrail Web

CardTrail's web client is a Next.js 14 application that powers the dashboard, search experience, and supporting surfaces. This document highlights the new `/market` route added in Phase 03 along with the core workflows for local development.

## Market Dashboard (`/market`)

- **Purpose:** Provide a Bloomberg-style view of the CardTrail Index (CTI), sub-indices, top movers, and liquidity proxies.
- **Data flow:** `loadMarketDashboard(range)` fetches recent rows from `market_indices` (with a JSON fixture fallback). All heavy calculations (percentage deltas, candlestick prep, movers ranking, volume aggregation) are executed server-side in `apps/web/lib/data/market.ts`.
- **Rendering model:** The page is an RSC entrypoint that streams the CTI hero, chart, carousel, movers, and volume sections. Interactive widgets (timeframe pills, candlestick chart, carousel scroll, volume toggle) are isolated as client components under `apps/web/components/market`.
- **Live indicator:** `LiveIndicator` respects `prefers-reduced-motion` and pulses every 5 seconds to communicate freshness.
- **Placeholders:** When Supabase credentials are unavailable the route seamlessly falls back to deterministic fixtures so e2e tests and local development continue to work.

### Component map

```
/market
├── CTIHeroCard (server)
│   └── LiveIndicator (client)
├── TimeframePills (client)
├── CandlestickChart (client, lazy loaded)
├── SubIndexCarousel (server)
├── TopMoversGrid (server)
└── VolumeChart (client)
```

### API helpers

`apps/web/app/api/search/*` now share the same fallback data that powers `/market` when Supabase is offline. This keeps the existing search e2e coverage green without leaking credentials.

## Development

```bash
pnpm install
pnpm dev        # starts Next.js via turbo
pnpm --filter web test:unit
pnpm --filter web test:e2e
```

Key directories:

- `app/` – Next.js route handlers and layouts
- `components/market/` – CTI hero, chart, carousel, movers, and skeletons
- `lib/data/market.ts` – Supabase fetcher, fixtures, and all CTI calculations
- `lib/supabase.ts` – Supabase client + deterministic fallbacks

## Data & testing notes

- All sensitive Supabase access happens through `createClient()`. Missing environment variables automatically trigger local fixtures so CI and Playwright can run without secrets.
- Vitest covers the data helpers (`adaptIndicesToRange`, `calculatePercentageChange`, etc.).
- Playwright validates navigation, search flows, and the `/market` UX (timeframe switching, carousel scroll, and responsiveness).

For manual validation steps refer to [`TESTING.md`](./TESTING.md).
