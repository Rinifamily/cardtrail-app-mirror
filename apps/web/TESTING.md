# Manual QA Checklist

## Market Dashboard (`/market`)

- [ ] CTI hero displays the latest value and +/- badge that matches the Supabase dataset or fixture.
- [ ] Timeframe pills (`24H`, `7D`, `30D`, `YTD`) update the candlestick chart and movers after the URL query switches.
- [ ] Candlestick chart renders OHLC data without grid lines and tooltips list Open/High/Low/Close.
- [ ] Sub-index carousel scrolls horizontally on <=640px viewports with snap behavior.
- [ ] Top gainers use red (% up) and losers use green (% down) per China trading convention.
- [ ] Volume chart toggles between transaction count and value, and shows the placeholder banner if fewer than 3 bars exist.
- [ ] Live indicator pulses every 5 seconds and remains static when `prefers-reduced-motion: reduce` is enabled.
- [ ] Layout remains fully functional on a 320px viewport (iPhone SE) and scales cleanly at ≥1440px.

## Search APIs (fixture fallback)

- [ ] `/api/search/filter-options` returns deterministic sets/years without Supabase credentials.
- [ ] `/api/search/autocomplete?q=Pika` responds with at least one suggestion.
- [ ] `/api/search/cards?q=Pikachu` returns pagination metadata plus card rows.

## Test Harness (`/test`)

- [ ] The Supabase connectivity page renders 10 cards (fixture or live data) and never hard-crashes when environment variables are absent.
