# CardTrail Architecture Overview

**Document Version:** 2.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Author:** Technical Architecture Team

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Monorepo Structure](#monorepo-structure)
3. [System Architecture](#system-architecture)
4. [Tech Stack](#tech-stack)
5. [Component Structure](#component-structure)
6. [Data Flow](#data-flow)
7. [Integration Architecture](#integration-architecture)
8. [Deployment Architecture](#deployment-architecture)
9. [Security Architecture](#security-architecture)
10. [Performance Strategy](#performance-strategy)
11. [Scalability Plan](#scalability-plan)
12. [Development Environment](#development-environment)
13. [AI Development Guidelines](#ai-development-guidelines)

---

## Executive Summary

### What is CardTrail?

**CardTrail (卡迹)** is a mobile-first web application designed for Chinese Pokemon TCG collectors to track card prices, manage collections, and analyze market trends. The platform provides:

- **Real-time Price Tracking**: CT (CardTrail) Price algorithm aggregating eBay transaction data
- **Collection Management**: Portfolio tracking with P/L monitoring
- **Market Intelligence**: CTI (CardTrail Index) tracking market trends
- **Multi-language Support**: Japanese, English, and Chinese cards
- **Mobile-First UX**: Optimized for 80% mobile users

### Target Audience

- **Geographic**: Mainland China, Hong Kong, Taiwan
- **Age**: 18-35 years old
- **Platform**: 80% mobile (iOS/Android), 20% desktop
- **Language**: Simplified Chinese (primary), Traditional Chinese + English (secondary)

### Core Innovation

The **CT Price** is a proprietary guidance price calculated from:
1. Recent eBay sold listings (weighted by recency)
2. Current active listings (lower weight)
3. Statistical outlier removal
4. Grading tier adjustments (PSA 10/9/8, BGS, CGC, Raw)
5. Language variant normalization

---

## Monorepo Structure

### Modern Development Architecture

CardTrail uses a **monorepo architecture** with **pnpm workspaces** and **Turborepo** for optimal code organization and build performance.

**Why Monorepo?**
- ✅ Share TypeScript types across frontend and backend
- ✅ Atomic changes (update shared code and consumers in single PR)
- ✅ Simplified dependency management
- ✅ Faster builds with Turborepo caching
- ✅ Better code reuse (UI components, validations, database queries)

### Package Structure

```
cardtrail-app/
├── apps/
│   ├── web/              # Next.js web application (frontend + API routes)
│   └── api/              # Future: Standalone API service (Phase 3+)
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   ├── db/               # Supabase client wrapper
│   ├── ui/               # Shared UI components (shadcn/ui)
│   ├── validations/      # Zod validation schemas
│   └── config/           # Shared configs (ESLint, TypeScript, Tailwind)
└── supabase/             # Supabase migrations & functions
```

**📖 See [monorepo-architecture.md](monorepo-architecture.md) for complete details.**

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LAYER                              │
│  Mobile Browser (iOS/Android)  │  Desktop Browser (Chrome/Edge) │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ HTTPS
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                    CDN LAYER (Vercel Edge)                      │
│  • Static Assets Caching                                        │
│  • Image Optimization                                           │
│  • Geographic Distribution                                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│              FRONTEND + API LAYER (Next.js 14)                  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  React Frontend  │  │  API Routes      │                    │
│  │  (App Router)    │  │  /api/v1/*       │                    │
│  │                  │  │                  │                    │
│  │  • UI Components │  │  • REST Endpoints│                    │
│  │  • Client State  │  │  • Rate Limiting │                    │
│  │  • PWA Service   │  │  • Auth Middleware                    │
│  │    Worker        │  │  • Error Handling│                    │
│  └──────────────────┘  └────────┬─────────┘                    │
│                                  │                               │
└──────────────────────────────────┼───────────────────────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     │                           │
          ┌──────────▼────────┐     ┌───────────▼──────────┐
          │  SUPABASE LAYER   │     │  EXTERNAL APIS       │
          │  (PostgreSQL)     │     │                      │
          │                   │     │  ┌────────────────┐  │
          │  • User Auth      │     │  │  eBay API      │  │
          │  • Database       │     │  │  (Finding,     │  │
          │  • Storage        │     │  │   Shopping,    │  │
          │  • Row Security   │     │  │   Trading)     │  │
          │  • Real-time      │     │  └────────────────┘  │
          │    Subscriptions  │     │                      │
          └───────────────────┘     │  ┌────────────────┐  │
                                    │  │  PSA API       │  │
                                    │  │  (Future)      │  │
                                    │  └────────────────┘  │
                                    └─────────────────────┘
```

### Architecture Principles

1. **Mobile-First**: Design for 375px mobile viewport first, scale up
2. **SSR for SEO**: Server-side render card profile pages for search engine crawling
3. **API-First**: Clean separation between frontend and backend logic
4. **Caching Aggressive**: Minimize eBay API calls (5000/day limit in sandbox)
5. **Progressive Enhancement**: Works without JavaScript, enhanced with it
6. **Chinese Optimized**: Baidu SEO, simplified Chinese primary

---

## Tech Stack

### Frontend Technology

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Framework** | Next.js | 14+ | SSR for SEO, API routes eliminate separate backend, App Router for modern patterns |
| **UI Library** | React | 18+ | Industry standard, large ecosystem, hooks for state management |
| **Language** | TypeScript | 5+ | Type safety, better DX, catch errors at compile time |
| **Styling** | Tailwind CSS | 3+ | Rapid development, mobile-first utilities, small bundle size |
| **UI Foundation** | shadcn/ui | Latest | Copy-paste components, full customization, Radix UI primitives |
| **UI Enhancement** | DaisyUI | 4+ | Pre-styled Tailwind components, 30+ themes, zero-runtime |
| **State Management** | Zustand | 4+ | Lightweight (3KB), simple API, no boilerplate like Redux |
| **Data Fetching** | TanStack Query (React Query) | 5+ | Built-in caching, background refetching, optimistic updates |
| **Charts** | Recharts | 2+ | React-native, composable, good mobile performance |
| **Forms** | React Hook Form | 7+ | Performant, minimal re-renders, easy validation |
| **Validation** | Zod | 3+ | TypeScript-first schema validation |
| **Icons** | Lucide React | Latest | Lightweight, tree-shakeable, consistent design |

### Backend Technology

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **API Framework** | Next.js API Routes | 14+ | Serverless functions, no separate backend needed |
| **Database** | Supabase PostgreSQL | Latest | Managed PostgreSQL, built-in auth, row-level security |
| **ORM** | Supabase Client | Latest | Native TypeScript support, real-time subscriptions |
| **Authentication** | Supabase Auth | Latest | OAuth providers, email/password, magic links |
| **Storage** | Supabase Storage | Latest | For user uploads (future: profile pics, collection images) |
| **Caching** | Vercel Edge Cache | Native | API response caching, geographic distribution |

### External Integrations

| Service | Purpose | Rate Limits | Cost |
|---------|---------|-------------|------|
| **eBay Finding API** | Search sold/active listings | 5K/day (sandbox), 5M/day (prod) | Free tier |
| **eBay Shopping API** | Item details | 5K/day (sandbox) | Free tier |
| **eBay Trading API** | Transaction history | 5K/day (sandbox) | Free tier |
| **TCGPlayer CDN** | Card images (already in `card_jp.image_urls`) | N/A | Free (public CDN) |
| **PSA API** | Population reports (future) | TBD | TBD |

### Development Tools

| Category | Tool | Purpose |
|----------|------|---------|
| **Package Manager** | pnpm | Faster, more efficient than npm |
| **Linting** | ESLint | Code quality, enforce standards |
| **Formatting** | Prettier | Consistent code style |
| **Testing** | Jest + React Testing Library | Unit and integration tests |
| **E2E Testing** | Playwright | Critical user flow testing |
| **Type Checking** | TypeScript Compiler | Compile-time type safety |
| **Git Hooks** | Husky + lint-staged | Pre-commit quality checks |
| **Documentation** | Storybook (optional) | Component documentation |

### Deployment & DevOps

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Hosting** | Vercel | Seamless Next.js deployment, edge functions |
| **Database** | Supabase Cloud | Managed PostgreSQL, automatic backups |
| **CDN** | Vercel Edge Network | Global asset distribution, low latency |
| **Monitoring** | Sentry | Error tracking and performance monitoring |
| **Analytics** | Umami | Privacy-friendly analytics (GDPR compliant) |
| **Uptime** | Better Uptime | Availability monitoring, status page |
| **CI/CD** | GitHub Actions | Automated testing and deployment |

### Why These Choices?

#### Why Next.js over Create React App?
- **SSR Built-in**: Card profile pages need SEO for Baidu/Google
- **API Routes**: No need for separate Express/Fastify backend
- **Image Optimization**: Built-in lazy loading, blur placeholders
- **Performance**: Automatic code splitting, route prefetching
- **Production Ready**: Used by Notion, TikTok, Twitch

#### Why Supabase over Firebase?
- **PostgreSQL**: Mature RDBMS with complex queries (vs NoSQL)
- **Open Source**: Can self-host if needed
- **SQL Power**: Joins, transactions, foreign keys
- **Row-Level Security**: Fine-grained permissions
- **Real-time**: WebSocket subscriptions for live data

#### Why Zustand over Redux?
- **Bundle Size**: 3KB vs 47KB (Redux + Toolkit)
- **Simplicity**: No actions, reducers, middleware boilerplate
- **TypeScript**: First-class TS support
- **Performance**: No Context API, no unnecessary re-renders

#### Why React Query over Manual Fetching?
- **Caching**: Automatic request deduplication
- **Background Refetch**: Keep data fresh without user action
- **Optimistic Updates**: Instant UI updates before server confirms
- **Retry Logic**: Automatic retry on network failures
- **DevTools**: Inspect cache and query states

#### Why Recharts over D3.js?
- **React Native**: Declarative components, not imperative D3
- **Bundle Size**: Smaller than full D3 library
- **Mobile Performance**: Optimized for touch interactions
- **Learning Curve**: Easier for React developers
- **Customizable**: Enough flexibility for our K-line charts

---

## Component Structure

### Frontend Architecture

```
src/
├── app/                          # Next.js 14 App Router
│   ├── layout.tsx               # Root layout (providers, fonts)
│   ├── page.tsx                 # Landing page (redirect to /market)
│   ├── (auth)/                  # Auth route group
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/                  # Main app route group
│   │   ├── layout.tsx          # Main layout with bottom nav
│   │   ├── market/             # 大盘 (Market) module
│   │   ├── collection/         # 持仓 (Collection) module
│   │   ├── search/             # 搜卡 (Search) module
│   │   ├── rankings/           # 榜单 (Rankings) module
│   │   └── profile/            # 我的 (Profile) module
│   └── api/                     # API routes
│       └── v1/                  # Versioned API
│           ├── cards/
│           ├── collections/
│           ├── market/
│           ├── users/
│           └── internal/        # Internal APIs (cron jobs)
│
├── components/                   # Shared UI components
│   ├── ui/                      # Base components (Button, Card, Modal)
│   ├── features/                # Feature-specific components
│   │   ├── cards/              # Card-related components
│   │   ├── charts/             # Chart components
│   │   ├── collections/        # Collection components
│   │   └── market/             # Market components
│   └── layouts/                # Layout components (Navbar, BottomNav)
│
├── lib/                         # Utility libraries
│   ├── supabase/               # Supabase client and helpers
│   ├── ebay/                   # eBay API integration
│   ├── price-algorithm/        # CT Price calculation
│   ├── utils/                  # Generic utilities
│   └── validations/            # Zod schemas
│
├── hooks/                       # Custom React hooks
│   ├── useAuth.ts              # Authentication hook
│   ├── useCollection.ts        # Collection management
│   ├── useCardPrice.ts         # Price data fetching
│   └── useMarketIndex.ts       # Market index data
│
├── stores/                      # Zustand state stores
│   ├── authStore.ts            # User authentication state
│   ├── collectionStore.ts      # Collection state
│   └── uiStore.ts              # UI state (modals, toasts)
│
├── types/                       # TypeScript type definitions
│   ├── database.ts             # Database table types
│   ├── api.ts                  # API request/response types
│   └── ebay.ts                 # eBay API types
│
├── config/                      # Configuration files
│   ├── site.ts                 # Site metadata
│   └── constants.ts            # App constants
│
└── styles/                      # Global styles
    └── globals.css             # Tailwind imports + custom styles
```

### Component Hierarchy

```
App
├── RootLayout
│   ├── Providers (QueryClientProvider, Toaster)
│   ├── Font Configuration
│   └── Metadata
│
├── MainLayout (for authenticated routes)
│   ├── Header (mobile: none, desktop: top nav)
│   ├── Main Content
│   └── BottomNavigation (mobile: fixed, desktop: none)
│       ├── MarketTab
│       ├── CollectionTab
│       ├── SearchTab
│       ├── RankingsTab
│       └── ProfileTab
│
└── Pages (see ui-component-hierarchy.md for details)
```

### Backend Structure

```
API Routes (/api/v1/)
├── cards/
│   ├── route.ts                # GET /api/v1/cards (search)
│   ├── [id]/
│   │   ├── route.ts           # GET /api/v1/cards/:id
│   │   └── price-history/
│   │       └── route.ts       # GET /api/v1/cards/:id/price-history
│   └── compare/
│       └── route.ts           # POST /api/v1/cards/compare
│
├── collections/
│   ├── route.ts               # GET, POST /api/v1/collections
│   ├── [id]/
│   │   └── route.ts          # PATCH, DELETE /api/v1/collections/:id
│   └── summary/
│       └── route.ts          # GET /api/v1/collections/summary
│
├── market/
│   ├── indices/
│   │   └── route.ts          # GET /api/v1/market/indices
│   ├── rankings/
│   │   └── route.ts          # GET /api/v1/market/rankings
│   └── news/
│       └── route.ts          # GET /api/v1/market/news
│
├── users/
│   ├── me/
│   │   └── route.ts          # GET, PATCH /api/v1/users/me
│   └── watchlists/
│       ├── route.ts          # GET, POST /api/v1/users/watchlists
│       └── [id]/
│           └── route.ts      # DELETE /api/v1/users/watchlists/:id
│
└── internal/                  # Protected internal APIs
    ├── sync-prices/
    │   └── route.ts          # POST /api/internal/sync-prices (cron)
    └── ebay/
        └── search/
            └── route.ts      # GET /api/internal/ebay/search
```

---

## Data Flow

### User Authentication Flow

```
1. User visits app
   ↓
2. Check Supabase Auth session
   ↓
   ├─ Session exists → Load user data → Render main app
   │
   └─ No session → Redirect to /login
      ↓
3. User enters credentials
   ↓
4. POST to Supabase Auth
   ↓
5. Supabase returns JWT + user object
   ↓
6. Store JWT in httpOnly cookie (Supabase handles this)
   ↓
7. Update authStore with user data
   ↓
8. Redirect to /market
```

### Card Search Flow

```
1. User types in search bar
   ↓
2. Debounce input (300ms)
   ↓
3. Client sends: GET /api/v1/cards?q=pikachu&language=jp
   ↓
4. API route handler:
   a. Validate query params (Zod)
   b. Check rate limit (Redis or in-memory)
   c. Query Supabase cards table
   d. Apply filters (language, rarity, set)
   e. Return paginated results
   ↓
5. React Query caches response
   ↓
6. UI renders CardGrid component
   ↓
7. User clicks card
   ↓
8. Navigate to /search/cards/[id]
```

### CT Price Calculation Flow

```
1. User views card profile page: /search/cards/[id]
   ↓
2. Server-side rendering (for SEO):
   a. Fetch card data from Supabase
   b. Check if price_history has recent data (<24h)
   c. If fresh → Return cached CT Price
   d. If stale → Trigger background price update
   ↓
3. Background price update (API route):
   a. Query eBay Finding API (sold listings, last 90 days)
   b. Filter by card name + set + grading
   c. Remove outliers (IQR method)
   d. Apply recency weights (exponential decay)
   e. Calculate weighted average
   f. Store in price_history table
   g. Update card.current_price_psa10, etc.
   ↓
4. Client hydrates page with interactive chart
   ↓
5. User switches grading tab (PSA 9)
   ↓
6. Client fetches: GET /api/v1/cards/[id]/price-history?grade=psa9
   ↓
7. API returns cached or calculated price
   ↓
8. Chart updates with new data (React Query refetch)
```

### Collection Management Flow

```
1. User adds card to collection
   ↓
2. Client sends: POST /api/v1/collections
   {
     card_id: "123",
     quantity: 1,
     purchase_price: 150.00,
     purchase_date: "2024-12-01",
     grading_company: "PSA",
     grade: 10
   }
   ↓
3. API route handler:
   a. Authenticate user (Supabase JWT)
   b. Validate request body (Zod)
   c. Check card exists in cards table
   d. Insert into collections table
   e. Update user's portfolio stats (cache)
   ↓
4. Optimistic update in UI (React Query)
   ↓
5. Background: Recalculate portfolio summary
   ↓
6. If add fails → Rollback optimistic update
   ↓
7. Toast notification: "Card added to collection!"
```

### Market Index Update Flow (Cron Job)

```
1. Vercel Cron triggers: POST /api/internal/sync-prices
   (Daily at 00:00 UTC)
   ↓
2. API route (protected by API key):
   a. Verify internal API key
   b. Query all cards with active tracking
   c. For each card:
      i.   Fetch eBay data
      ii.  Calculate CT Price
      iii. Store in price_history
   ↓
3. Calculate CTI (CardTrail Index):
   a. Fetch top 100 cards by market cap
   b. Weight by trading volume
   c. Calculate index value
   d. Store in market_indices table
   ↓
4. Calculate sub-indices:
   - WOTC Index (Wizards of the Coast era)
   - Modern Index (2017+)
   - Japanese Index
   - English Index
   ↓
5. Log completion to monitoring (Sentry)
   ↓
6. Send summary email to admin (optional)
```

---

## Integration Architecture

### Supabase Integration

#### Database Schema
- See `data-models.md` for complete schema
- Tables: cards, users, collections, watchlists, price_history, transactions, market_indices

#### Authentication
```typescript
// Initialize Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Sign out
await supabase.auth.signOut();
```

#### Row-Level Security (RLS)
```sql
-- Users can only read their own collections
CREATE POLICY "Users can view own collections"
  ON collections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own collections
CREATE POLICY "Users can insert own collections"
  ON collections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

#### Real-time Subscriptions
```typescript
// Subscribe to user's collection changes
const channel = supabase
  .channel('collection-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'collections',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Collection updated:', payload);
      queryClient.invalidateQueries(['collections']);
    }
  )
  .subscribe();
```

### eBay API Integration

#### API Credentials
```env
EBAY_APP_ID=your_app_id
EBAY_DEV_ID=your_dev_id
EBAY_CERT_ID=your_cert_id
EBAY_ENVIRONMENT=SANDBOX # or PRODUCTION
```

#### Finding API (Search Listings)
```typescript
// lib/ebay/finding-api.ts
import axios from 'axios';

interface EbayFindingParams {
  keywords: string;
  categoryId?: string;
  itemFilter?: Array<{
    name: string;
    value: string | string[];
  }>;
  sortOrder?: 'BestMatch' | 'EndTimeSoonest' | 'PricePlusShippingLowest';
}

export async function searchCompletedListings(params: EbayFindingParams) {
  const response = await axios.get(
    'https://svcs.sandbox.ebay.com/services/search/FindingService/v1',
    {
      params: {
        'OPERATION-NAME': 'findCompletedItems',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': process.env.EBAY_APP_ID,
        'RESPONSE-DATA-FORMAT': 'JSON',
        keywords: params.keywords,
        'itemFilter(0).name': 'SoldItemsOnly',
        'itemFilter(0).value': 'true',
        'itemFilter(1).name': 'ListingType',
        'itemFilter(1).value': 'FixedPrice',
        'paginationInput.entriesPerPage': '100',
        'sortOrder': 'EndTimeSoonest'
      }
    }
  );

  return response.data.findCompletedItemsResponse[0].searchResult[0].item || [];
}
```

#### Rate Limiting Strategy
```typescript
// lib/ebay/rate-limiter.ts
import Bottleneck from 'bottleneck';

// Sandbox: 5000 calls/day = ~3.5 calls/minute
// Production: 5M calls/day = ~3500 calls/minute
const limiter = new Bottleneck({
  reservoir: 5000,               // Total tokens
  reservoirRefreshAmount: 5000,  // Refill amount
  reservoirRefreshInterval: 24 * 60 * 60 * 1000, // 24 hours
  maxConcurrent: 5,              // Max concurrent requests
  minTime: 200                   // Min 200ms between requests
});

export const rateLimitedEbayCall = limiter.wrap(async (fn: () => Promise<any>) => {
  return await fn();
});
```

#### Caching Strategy
```typescript
// Cache eBay responses for 24 hours
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN
});

export async function getCachedEbayData(cacheKey: string, fetchFn: () => Promise<any>) {
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from eBay
  const data = await fetchFn();

  // Cache for 24 hours
  await redis.set(cacheKey, data, { ex: 86400 });

  return data;
}
```

---

## Deployment Architecture

### Hosting Strategy

#### Vercel Deployment
- **Framework Preset**: Next.js
- **Build Command**: `pnpm build`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`
- **Development Command**: `pnpm dev`

#### Environment Variables
```env
# Public (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
NEXT_PUBLIC_SITE_URL=https://cardtrail.app

# Private (server-only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...
EBAY_APP_ID=your_app_id
EBAY_DEV_ID=your_dev_id
EBAY_CERT_ID=your_cert_id
INTERNAL_API_KEY=random_secret_key
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
```

### Multi-Region Strategy

#### Phase 1: Global Deployment
```
Primary: Vercel Edge Network (automatic)
Database: Supabase Singapore (closest to Chinese users)
CDN: Vercel Edge CDN (global)
```

#### Phase 2: China-Optimized (Future)
```
Primary: Vercel Edge + Alibaba Cloud CDN
Database: Supabase Singapore + Read Replicas in Hong Kong
Assets: Alibaba Cloud OSS (Object Storage Service)
Domain: .cn domain with ICP filing
```

### CDN Configuration

#### Image Optimization
```typescript
// next.config.js
module.exports = {
  images: {
    domains: [
      'product-images.tcgplayer.com',
      'images.pokemontcg.io',
      'xxx.supabase.co' // User uploads
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  }
};
```

#### Static Asset Caching
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/api/v1/cards/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400'
          }
        ]
      }
    ];
  }
};
```

### Continuous Deployment

#### Git Workflow
```
main branch
  └─ Auto-deploy to production (cardtrail.app)

develop branch
  └─ Auto-deploy to staging (staging.cardtrail.app)

feature/* branches
  └─ Preview deployments (feature-x.vercel.app)
```

#### GitHub Actions CI/CD
```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test
      - run: pnpm build
```

---

## Security Architecture

### Authentication & Authorization

#### Supabase Auth Flow
1. User signs up/logs in via Supabase Auth
2. Supabase issues JWT (JSON Web Token)
3. JWT stored in httpOnly cookie (XSS protection)
4. Every API request validates JWT
5. Row-Level Security enforces data access

#### API Route Protection
```typescript
// lib/auth/middleware.ts
import { createServerClient } from '@supabase/ssr';

export async function requireAuth(request: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.headers.get('cookie')?.match(name)?.[1];
        }
      }
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  return user;
}

// Usage in API route
export async function POST(request: Request) {
  const user = await requireAuth(request);
  if (user instanceof Response) return user;

  // Proceed with authenticated request
  // ...
}
```

### API Security

#### Rate Limiting
```typescript
// lib/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN
});

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true
});

// Usage in API route
export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { success, limit, remaining, reset } = await rateLimiter.limit(ip);

  if (!success) {
    return new Response('Too many requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString()
      }
    });
  }

  // Proceed with request
  // ...
}
```

#### Input Validation
```typescript
// lib/validations/card-search.ts
import { z } from 'zod';

export const cardSearchSchema = z.object({
  q: z.string().min(1).max(100),
  language: z.enum(['jp', 'en', 'cn']).optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'rare_holo', 'ultra_rare']).optional(),
  set: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// Usage in API route
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams);

  const result = cardSearchSchema.safeParse(params);

  if (!result.success) {
    return new Response(JSON.stringify({
      error: {
        code: 'INVALID_PARAMS',
        message: 'Invalid query parameters',
        details: result.error.errors
      }
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Proceed with validated params
  const validParams = result.data;
  // ...
}
```

#### CORS Configuration
```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  const response = NextResponse.next();

  // Only allow same-origin requests (no CORS for external sites)
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_SITE_URL);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export const config = {
  matcher: '/api/:path*'
};
```

### Data Privacy

#### Row-Level Security (RLS)
```sql
-- Enable RLS on collections table
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own collections
CREATE POLICY "Users view own collections"
  ON collections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own collections
CREATE POLICY "Users insert own collections"
  ON collections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own collections
CREATE POLICY "Users update own collections"
  ON collections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own collections
CREATE POLICY "Users delete own collections"
  ON collections
  FOR DELETE
  USING (auth.uid() = user_id);
```

#### Sensitive Data Handling
- **API Keys**: Never expose in client-side code
- **User Data**: Encrypted at rest (Supabase default)
- **Passwords**: Hashed with bcrypt (Supabase Auth handles)
- **Session Tokens**: httpOnly cookies (no localStorage)

### Security Headers
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  }
};
```

---

## Performance Strategy

### Target Metrics

| Metric | Target | Critical User Flow |
|--------|--------|-------------------|
| **First Contentful Paint (FCP)** | < 1.0s | All pages |
| **Largest Contentful Paint (LCP)** | < 2.0s | Card profile page |
| **Time to Interactive (TTI)** | < 3.0s | Search page |
| **Cumulative Layout Shift (CLS)** | < 0.1 | All pages |
| **First Input Delay (FID)** | < 100ms | All interactions |
| **API Response Time** | < 200ms | Card search |
| **Database Query Time** | < 50ms | Single card lookup |

### Optimization Techniques

#### 1. Server-Side Rendering (SSR)
```typescript
// app/(main)/search/cards/[id]/page.tsx
export default async function CardProfilePage({ params }: { params: { id: string } }) {
  // Fetch card data on server (for SEO)
  const card = await getCardById(params.id);
  const priceHistory = await getCardPriceHistory(params.id);

  // Return pre-rendered HTML
  return (
    <CardProfile card={card} priceHistory={priceHistory} />
  );
}

// Generate static params for popular cards (ISR)
export async function generateStaticParams() {
  const popularCards = await getPopularCards(100);
  return popularCards.map((card) => ({
    id: card.id.toString()
  }));
}

// Revalidate every 24 hours
export const revalidate = 86400;
```

#### 2. Image Optimization
```typescript
// components/CardImage.tsx
import Image from 'next/image';

export function CardImage({ card }: { card: Card }) {
  return (
    <Image
      src={card.image_urls.large}
      alt={card.card_name}
      width={500}
      height={700}
      placeholder="blur"
      blurDataURL={card.image_urls.small}
      loading="lazy"
      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
    />
  );
}
```

#### 3. Code Splitting
```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const PriceChart = dynamic(() => import('@/components/features/charts/PriceChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false // Chart doesn't need SSR
});

const CardComparison = dynamic(() => import('@/components/features/cards/CardComparison'), {
  loading: () => <ComparisonSkeleton />
});
```

#### 4. Database Indexing
```sql
-- Index frequently queried columns
CREATE INDEX idx_cards_card_name ON cards(card_name);
CREATE INDEX idx_cards_set_slug ON cards(set_slug);
CREATE INDEX idx_cards_language ON cards(language);

-- Composite index for common filters
CREATE INDEX idx_cards_language_rarity ON cards(language, rarity);

-- Index foreign keys
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_card_id ON collections(card_id);
CREATE INDEX idx_price_history_card_id_date ON price_history(card_id, date DESC);

-- Full-text search index
CREATE INDEX idx_cards_search ON cards USING GIN (
  to_tsvector('english', card_name || ' ' || set_name)
);
```

#### 5. React Query Caching
```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 minute
      cacheTime: 5 * 60 * 1000,    // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Usage: Prefetch on hover
function CardGridItem({ card }: { card: Card }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch card details on hover
    queryClient.prefetchQuery({
      queryKey: ['card', card.id],
      queryFn: () => fetchCardById(card.id)
    });
  };

  return (
    <Link href={`/search/cards/${card.id}`} onMouseEnter={handleMouseEnter}>
      <CardImage card={card} />
    </Link>
  );
}
```

#### 6. API Response Caching
```typescript
// app/api/v1/cards/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const card = await getCardById(params.id);

  return new Response(JSON.stringify(card), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      // Cache for 1 hour, serve stale for 24 hours while revalidating
    }
  });
}
```

#### 7. Bundle Size Optimization
```typescript
// next.config.js
module.exports = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts']
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: false,
        vendors: false,
        lib: {
          name: 'lib',
          test: /[\\/]node_modules[\\/]/,
          priority: 10,
          minChunks: 1,
          reuseExistingChunk: true
        },
        commons: {
          name: 'commons',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    };
    return config;
  }
};
```

---

## Scalability Plan

### Current Capacity (Phase 0-2)

| Resource | Capacity | Cost |
|----------|----------|------|
| **Vercel (Pro)** | 1TB bandwidth, 1000 GB-hours compute | $20/mo |
| **Supabase (Pro)** | 8GB database, 100GB bandwidth | $25/mo |
| **eBay API** | 5M calls/day (production) | Free |
| **Upstash Redis** | 10K commands/day | Free tier |

**Estimated Load:**
- 10K users, 50K page views/month
- ~500 API calls/hour
- ~100 eBay API calls/day (heavily cached)

### Scaling Roadmap

#### 100K Users (Phase 3-4)
**Bottlenecks:**
- Database reads (collections, price_history)
- eBay API rate limits
- Image loading

**Solutions:**
1. **Database Read Replicas**: Supabase supports read replicas
2. **CDN for Images**: Already using TCGPlayer CDN + Vercel Edge
3. **Redis Caching Layer**: Cache hot cards, search results
4. **Background Workers**: Move price calculations to queue (BullMQ)

```typescript
// Implement Redis caching for hot cards
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN
});

export async function getCachedCard(cardId: string) {
  const cached = await redis.get(`card:${cardId}`);
  if (cached) return cached;

  const card = await fetchCardFromDb(cardId);
  await redis.set(`card:${cardId}`, card, { ex: 3600 }); // 1 hour
  return card;
}
```

#### 500K Users (Phase 5-6)
**Bottlenecks:**
- Supabase connection limits
- API route cold starts
- Complex aggregations (portfolio stats)

**Solutions:**
1. **Connection Pooling**: PgBouncer for Supabase
2. **Edge Functions**: Move API routes to Vercel Edge Functions (faster cold starts)
3. **Materialized Views**: Pre-calculate portfolio stats

```sql
-- Materialized view for portfolio summaries
CREATE MATERIALIZED VIEW user_portfolio_summary AS
SELECT
  user_id,
  COUNT(*) AS total_cards,
  SUM(quantity) AS total_quantity,
  SUM(purchase_price * quantity) AS total_invested,
  SUM(current_value * quantity) AS current_value,
  SUM(current_value * quantity) - SUM(purchase_price * quantity) AS profit_loss
FROM collections c
JOIN cards ON c.card_id = cards.id
GROUP BY user_id;

-- Refresh daily
REFRESH MATERIALIZED VIEW CONCURRENTLY user_portfolio_summary;
```

#### 1M+ Users (Future)
**Bottlenecks:**
- Database writes (collections, price updates)
- Real-time subscriptions
- Search performance

**Solutions:**
1. **Sharding**: Shard users by region (CN, HK/TW, Global)
2. **Elasticsearch**: Full-text search offloading
3. **Message Queue**: Kafka/SQS for async processing
4. **Microservices**: Separate price calculation service

### Database Scaling Strategy

#### Vertical Scaling (Immediate)
```
Free Tier → Pro ($25/mo) → Team ($599/mo)
500 MB → 8 GB → 32 GB database
```

#### Horizontal Scaling (100K+ users)
1. **Read Replicas**: Separate read/write traffic
2. **Partitioning**: Partition `price_history` by date
3. **Archiving**: Move old data (>2 years) to cold storage

```sql
-- Partition price_history by month
CREATE TABLE price_history (
  id BIGSERIAL,
  card_id BIGINT,
  date DATE,
  price DECIMAL(10,2),
  PRIMARY KEY (id, date)
) PARTITION BY RANGE (date);

CREATE TABLE price_history_2024_12 PARTITION OF price_history
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE price_history_2025_01 PARTITION OF price_history
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Monitoring & Alerting

#### Key Metrics to Monitor
1. **Performance**: Vercel Analytics, Sentry Performance
2. **Errors**: Sentry error tracking
3. **Database**: Supabase Dashboard (CPU, memory, connections)
4. **API**: Uptime Robot (availability)
5. **Costs**: Vercel/Supabase billing dashboards

#### Alert Thresholds
```
- API response time > 1s (5 min average)
- Error rate > 1% (5 min average)
- Database CPU > 80% (sustained 10 min)
- eBay API rate limit > 80% (daily quota)
- Vercel bandwidth > 800 GB (monthly)
```

---

## Development Environment

### Local Setup

#### Prerequisites
```bash
# Required
node >= 20.0.0
pnpm >= 8.0.0

# Optional
docker >= 24.0.0 (for local Supabase)
```

#### Installation
```bash
# Clone repository
git clone https://github.com/your-org/cardtrail-app.git
cd cardtrail-app

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Fill in your credentials in .env.local
# - Supabase URL and keys
# - eBay API credentials

# Run database migrations (if using local Supabase)
pnpm supabase db reset

# Start development server
pnpm dev

# Open http://localhost:3000
```

#### Project Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "prepare": "husky install",
    "db:types": "supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts"
  }
}
```

### Development Workflow

#### Feature Branch Workflow
```bash
# Create feature branch
git checkout -b feature/card-search

# Make changes, commit often
git add .
git commit -m "feat: add card search autocomplete"

# Push to remote
git push origin feature/card-search

# Create pull request on GitHub
# Vercel will create preview deployment automatically
```

#### Code Quality Checks
```bash
# Run before committing
pnpm lint          # ESLint
pnpm type-check    # TypeScript
pnpm test          # Jest tests
pnpm format        # Prettier
```

#### Pre-commit Hooks (Husky)
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{md,json}": [
      "prettier --write"
    ]
  }
}
```

### Testing Strategy

#### Unit Tests (Jest)
```typescript
// __tests__/lib/price-algorithm.test.ts
import { calculateCTPrice } from '@/lib/price-algorithm';

describe('calculateCTPrice', () => {
  it('should calculate weighted average price', () => {
    const listings = [
      { price: 100, soldDate: new Date('2024-12-01') },
      { price: 120, soldDate: new Date('2024-12-03') },
      { price: 110, soldDate: new Date('2024-12-04') }
    ];

    const result = calculateCTPrice(listings);

    expect(result).toBeCloseTo(112, 0); // ~112 with recency weighting
  });

  it('should remove outliers', () => {
    const listings = [
      { price: 100, soldDate: new Date() },
      { price: 105, soldDate: new Date() },
      { price: 1000, soldDate: new Date() }, // Outlier
      { price: 110, soldDate: new Date() }
    ];

    const result = calculateCTPrice(listings);

    expect(result).toBeLessThan(150); // Should ignore 1000
  });
});
```

#### Integration Tests (React Testing Library)
```typescript
// __tests__/components/CardSearch.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardSearch from '@/components/features/cards/CardSearch';

describe('CardSearch', () => {
  it('should show autocomplete suggestions', async () => {
    render(<CardSearch />);

    const input = screen.getByPlaceholderText('Search cards...');
    await userEvent.type(input, 'Pikachu');

    await waitFor(() => {
      expect(screen.getByText('Pikachu VMAX')).toBeInTheDocument();
    });
  });
});
```

#### E2E Tests (Playwright)
```typescript
// e2e/card-profile.spec.ts
import { test, expect } from '@playwright/test';

test('should display card profile with price chart', async ({ page }) => {
  await page.goto('/search/cards/123');

  // Wait for card to load
  await expect(page.locator('h1')).toContainText('Pikachu');

  // Check CT Price is displayed
  await expect(page.locator('[data-testid="ct-price"]')).toBeVisible();

  // Switch to PSA 9 tab
  await page.click('button:has-text("PSA 9")');

  // Chart should update
  await expect(page.locator('[data-testid="price-chart"]')).toBeVisible();
});
```

---

## Summary

This architecture is designed for:

✅ **Mobile-First**: 80% mobile users, thumb-friendly UI  
✅ **Chinese Market**: Simplified Chinese, CNY, Baidu SEO  
✅ **Scalable**: 10K → 1M users roadmap  
✅ **Performant**: <2s page load, <100ms search  
✅ **Secure**: Supabase Auth, RLS, rate limiting  
✅ **Cost-Effective**: $50/month for 100K users  
✅ **Developer Friendly**: TypeScript, modern stack, great DX

### Next Steps

1. **CRITICAL**: Review `agents.md` for AI development guidelines (mandatory for all developers)
2. Review `monorepo-architecture.md` for project structure with pnpm + Turborepo
3. Review `developer-workflow.md` for Taskfile commands and Git workflow
4. Review `frontend-architecture.md` for shadcn/ui + DaisyUI patterns
5. Review `backend-architecture.md` for Next.js API Routes architecture
6. Review `data-models.md` for complete database schema
7. Review `api-design.md` for REST API specifications
8. Review `feature-breakdown.md` for implementation phases
9. Review `price-algorithm.md` for CT Price calculation
10. Review `ui-component-hierarchy.md` for UI structure

### Questions or Concerns?

If any part of this architecture is unclear or needs adjustment, flag it **before implementation begins**. This document is the foundation for all future development.

---

## AI Development Guidelines

### Mandatory Reading: agents.md

**All AI-assisted development must follow [agents.md](agents.md).**

**Key Rules:**
- ❌ **Never** use `@ts-ignore` or `eslint-disable`
- ❌ **Never** use `any` type
- ❌ **Never** modify `card_jp` table directly
- ❌ **Never** bypass Row-Level Security
- ✅ **Always** validate with Zod
- ✅ **Always** use TypeScript strict mode
- ✅ **Always** use Taskfile commands
- ✅ **Always** follow existing patterns

**📖 See [agents.md](agents.md) for complete guidelines.**

---

**Document Status:** ✅ Ready for Implementation  
**Version:** 2.0 (Updated with monorepo architecture)  
**Last Review:** December 4, 2025  
**Next Review:** After Phase 1 completion

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) Architecture Planning
